/**
 * 图片上传处理云函数
 * 处理图片上传、压缩、格式转换
 */

const cloud = require('wx-server-sdk');
const fs = require('fs');
const path = require('path');
const { compressImage, validateImage } = require('../common/imageProcessor');
const { validate } = require('../common/validator');
const { info, error, logExecutionTime } = require('../common/logger');
const config = require('./config');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

/**
 * 生成云存储路径
 * @param {string} userId 用户ID
 * @param {string} type 图片类型
 * @returns {string}
 */
function generateCloudPath(userId, type) {
  const { basePath, paths } = config.storage;
  const subPath = paths[type] || 'others';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const filename = `${timestamp}-${random}.${config.image.outputFormat}`;
  
  return `${basePath}/${subPath}/${userId}/${filename}`;
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  const { filePath, type } = event;

  return await logExecutionTime('image-upload', async () => {
    try {
      // 参数验证
      const validation = validate(event, {
        filePath: {
          type: 'string',
          required: true,
          minLength: 1,
        },
        type: {
          type: 'string',
          required: true,
          enum: ['food', 'recipe', 'avatar'],
        },
      });

      if (!validation.isValid) {
        return {
          errCode: -1,
          errMsg: validation.errors[0].message,
          data: null,
        };
      }

      info('image-upload', '开始上传图片', { userId, type }, userId);

      // 验证图片文件
      try {
        await validateImage(filePath);
      } catch (err) {
        return {
          errCode: -2,
          errMsg: err.message || '图片验证失败',
          data: null,
        };
      }

      // 压缩图片（如果需要）
      let processedPath = filePath;
      try {
        const stats = fs.statSync(filePath);
        if (stats.size > config.image.maxFileSize) {
          // 图片过大，需要压缩
          const compressed = await compressImage(filePath, null, {
            maxWidth: config.image.maxWidth,
            maxHeight: config.image.maxHeight,
            quality: config.image.quality,
          });
          processedPath = compressed.path;
          info('image-upload', '图片压缩完成', { 
            originalSize: compressed.originalSize,
            compressedSize: compressed.size,
            ratio: compressed.compressionRatio.toFixed(1) + '%',
          }, userId);
        }
      } catch (err) {
        // 压缩失败，使用原图
        console.warn('图片压缩失败，使用原图:', err);
      }

      // 生成云存储路径
      const cloudPath = generateCloudPath(userId, type);

      // 上传到云存储
      const uploadResult = await cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: processedPath,
      });

      // 清理临时文件
      if (processedPath !== filePath && fs.existsSync(processedPath)) {
        fs.unlinkSync(processedPath);
      }

      // 获取文件URL
      const fileUrl = await cloud.getTempFileURL({
        fileList: [uploadResult.fileID],
      });

      info('image-upload', '图片上传成功', { 
        fileID: uploadResult.fileID,
        cloudPath: cloudPath,
      }, userId);

      return {
        errCode: 0,
        errMsg: 'success',
        data: {
          fileID: uploadResult.fileID,
          url: fileUrl.fileList[0].tempFileURL,
          cloudPath: cloudPath,
        },
      };
    } catch (err) {
      error('image-upload', '图片上传失败', err, userId);
      return {
        errCode: -1,
        errMsg: err.message || '上传失败',
        data: null,
      };
    }
  }, { userId });
};
