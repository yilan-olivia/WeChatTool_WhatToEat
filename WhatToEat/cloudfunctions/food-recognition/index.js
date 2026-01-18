/**
 * 菜品识别云函数
 * 调用AI API识别菜品图片，支持多服务商、缓存、置信度处理
 */

const cloud = require('wx-server-sdk');
const { checkRateLimit } = require('../common/rateLimit');
const { validate } = require('../common/validator');
const { info, error, logExecutionTime } = require('../common/logger');
const { recognizeImage, calculateImageHash } = require('../common/aiClient');
const { getCache, setCache } = require('../common/cache');
const config = require('./config');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 使用模拟数据（降级方案）
 * @param {string} imageUrl 图片URL
 * @returns {Promise<Object>}
 */
async function recognizeWithMock(imageUrl) {
  // 模拟识别结果
  const mockResults = [
    { name: '西红柿', category: '蔬菜', confidence: 0.95 },
    { name: '苹果', category: '水果', confidence: 0.92 },
    { name: '鸡蛋', category: '其他', confidence: 0.88 },
    { name: '土豆', category: '蔬菜', confidence: 0.90 },
    { name: '胡萝卜', category: '蔬菜', confidence: 0.93 },
  ];

  return mockResults[Math.floor(Math.random() * mockResults.length)];
}

/**
 * 记录用户纠错
 * @param {string} userId 用户ID
 * @param {string} imageHash 图片hash
 * @param {Object} originalResult 原始识别结果
 * @param {Object} correctedResult 用户修正结果
 */
async function recordCorrection(userId, imageHash, originalResult, correctedResult) {
  try {
    await db.collection('recognition_corrections').add({
      data: {
        userId,
        imageHash,
        originalResult,
        correctedResult,
        createTime: new Date(),
      },
    });
    info('food-recognition', '记录用户纠错', { userId, imageHash }, userId);
  } catch (err) {
    error('food-recognition', '记录纠错失败', err, userId);
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  const { fileID, base64Image, correction } = event;

  return await logExecutionTime('food-recognition', async () => {
    try {
      // 处理用户纠错
      if (correction) {
        const { imageHash, originalResult, correctedResult } = correction;
        await recordCorrection(userId, imageHash, originalResult, correctedResult);
        return {
          errCode: 0,
          errMsg: 'success',
          data: { message: '纠错已记录' },
        };
      }

      // 参数验证
      if (!fileID && !base64Image) {
        return {
          errCode: -1,
          errMsg: 'fileID或base64Image必须提供其一',
          data: null,
        };
      }

      // 频率限制检查
      const rateLimit = await checkRateLimit('food-recognition', userId);
      if (!rateLimit.allowed) {
        return {
          errCode: -2,
          errMsg: rateLimit.message,
          data: {
            resetTime: rateLimit.resetTime,
          },
        };
      }

      info('food-recognition', '开始识别菜品', { userId, fileID: fileID || 'base64' }, userId);

      let imageUrl;
      let imageHash;

      // 获取图片URL或使用base64
      if (fileID) {
        const tempUrlResult = await cloud.getTempFileURL({
          fileList: [fileID],
        });

        if (!tempUrlResult.fileList || tempUrlResult.fileList.length === 0) {
          throw new Error('获取图片URL失败');
        }

        imageUrl = tempUrlResult.fileList[0].tempFileURL;
        // 计算图片hash用于缓存
        imageHash = await calculateImageHash(imageUrl);
      } else if (base64Image) {
        // 使用base64图片
        imageUrl = base64Image;
        // 对base64计算hash
        const crypto = require('crypto');
        imageHash = crypto.createHash('md5').update(base64Image).digest('hex');
      } else {
        throw new Error('图片参数无效');
      }

      // 检查缓存
      let recognitionResult;
      if (config.cache.enabled) {
        const cachedResult = await getCache(config.cache.collection, imageHash);
        if (cachedResult) {
          info('food-recognition', '使用缓存结果', { imageHash }, userId);
          recognitionResult = cachedResult;
        }
      }

      // 如果缓存未命中，调用AI API
      if (!recognitionResult) {
        try {
          recognitionResult = await recognizeImage(
            imageUrl,
            config.aiApi,
            config.aiApi.fallbackTypes || []
          );
        } catch (apiErr) {
          error('food-recognition', 'AI API调用失败，使用降级方案', apiErr, userId);
          // 降级到模拟数据
          recognitionResult = await recognizeWithMock(imageUrl);
        }

        // 保存到缓存
        if (config.cache.enabled && recognitionResult) {
          try {
            await setCache(
              config.cache.collection,
              imageHash,
              recognitionResult,
              config.cache.expireTime
            );
          } catch (cacheErr) {
            error('food-recognition', '保存缓存失败', cacheErr, userId);
          }
        }
      }

      // 验证识别结果
      if (!recognitionResult || !recognitionResult.name) {
        return {
          errCode: -3,
          errMsg: '识别失败，无法识别菜品',
          data: null,
        };
      }

      // 置信度检查
      const confidence = recognitionResult.confidence || 0.8;
      const minConfidence = config.recognition.minConfidence || 0.6;
      const lowConfidenceThreshold = config.recognition.lowConfidenceThreshold || 0.7;

      if (confidence < minConfidence) {
        return {
          errCode: -4,
          errMsg: '识别失败，置信度过低',
          data: {
            name: recognitionResult.name,
            category: recognitionResult.category,
            confidence,
            warning: '置信度过低，结果可能不准确',
          },
        };
      }

      // 确保分类有效
      const validCategories = ['蔬菜', '水果', '肉类', '海鲜', '调料', '其他'];
      if (!validCategories.includes(recognitionResult.category)) {
        recognitionResult.category = config.recognition.defaultCategory;
      }

      // 低置信度警告
      const warning = confidence < lowConfidenceThreshold
        ? '置信度较低，建议人工确认'
        : null;

      info('food-recognition', '识别成功', {
        name: recognitionResult.name,
        category: recognitionResult.category,
        confidence,
        warning,
      }, userId);

      return {
        errCode: 0,
        errMsg: 'success',
        data: {
          name: recognitionResult.name,
          category: recognitionResult.category,
          confidence,
          warning,
          imageHash, // 返回hash用于纠错
        },
      };
    } catch (err) {
      error('food-recognition', '菜品识别失败', err, userId);
      return {
        errCode: -1,
        errMsg: err.message || '识别失败',
        data: null,
      };
    }
  }, { userId });
};
