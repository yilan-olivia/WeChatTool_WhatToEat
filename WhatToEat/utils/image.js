/**
 * 图片处理工具
 * 包含图片压缩、格式转换、上传预处理、缓存管理等功能
 */

import { cacheImage, getCachedImage, isImageCached } from './cache.js';
import { validateImageFile, validateImageSize } from './validator.js';

/**
 * 图片处理配置
 */
const IMAGE_CONFIG = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8, // 压缩质量（0-1）
  maxFileSize: 2 * 1024 * 1024, // 最大文件大小：2MB
  supportedFormats: ['jpg', 'jpeg', 'png', 'webp'],
};

/**
 * 压缩图片
 * @param {string} filePath 图片路径
 * @param {Object} options 压缩选项
 * @param {number} options.maxWidth 最大宽度
 * @param {number} options.maxHeight 最大高度
 * @param {number} options.quality 压缩质量
 * @returns {Promise<string>} 返回压缩后的图片路径
 */
export async function compressImage(filePath, options = {}) {
  const {
    maxWidth = IMAGE_CONFIG.maxWidth,
    maxHeight = IMAGE_CONFIG.maxHeight,
    quality = IMAGE_CONFIG.quality,
  } = options;

  try {
    // 获取图片信息
    const imageInfo = await new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: filePath,
        success: resolve,
        fail: reject,
      });
    });

    // 计算压缩尺寸
    let targetWidth = imageInfo.width;
    let targetHeight = imageInfo.height;

    if (targetWidth > maxWidth || targetHeight > maxHeight) {
      const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
      targetWidth = Math.round(targetWidth * ratio);
      targetHeight = Math.round(targetHeight * ratio);
    }

    // 使用canvas压缩（小程序方式）
    return await compressWithCanvas(filePath, targetWidth, targetHeight, quality);
  } catch (err) {
    console.error('压缩图片失败:', err);
    throw new Error('图片压缩失败');
  }
}

/**
 * 使用Canvas压缩图片
 * @param {string} filePath 图片路径
 * @param {number} width 目标宽度
 * @param {number} height 目标高度
 * @param {number} quality 压缩质量
 * @returns {Promise<string>}
 */
function compressWithCanvas(filePath, width, height, quality) {
  return new Promise((resolve, reject) => {
    // 创建canvas上下文
    const ctx = wx.createCanvasContext('compressCanvas');
    
    // 绘制图片
    ctx.drawImage(filePath, 0, 0, width, height);
    ctx.draw(false, () => {
      // 导出图片
      wx.canvasToTempFilePath({
        canvasId: 'compressCanvas',
        width,
        height,
        destWidth: width,
        destHeight: height,
        quality,
        success: (res) => {
          resolve(res.tempFilePath);
        },
        fail: reject,
      });
    });
  });
}

/**
 * 选择并处理图片
 * @param {Object} options 选项
 * @param {number} options.count 选择数量
 * @param {string} options.sourceType 来源类型（album/camera）
 * @param {boolean} options.compress 是否压缩
 * @param {boolean} options.validate 是否验证
 * @returns {Promise<Array<string>>} 返回处理后的图片路径数组
 */
export async function chooseAndProcessImage(options = {}) {
  const {
    count = 1,
    sourceType = ['album', 'camera'],
    compress = true,
    validate = true,
  } = options;

  try {
    // 选择图片
    const chooseResult = await new Promise((resolve, reject) => {
      wx.chooseImage({
        count,
        sourceType,
        sizeType: ['compressed'],
        success: resolve,
        fail: reject,
      });
    });

    const processedImages = [];

    for (const tempFilePath of chooseResult.tempFilePaths) {
      let processedPath = tempFilePath;

      // 验证图片
      if (validate) {
        const validation = await validateImageFile(tempFilePath);
        if (!validation.isValid) {
          throw new Error(validation.message);
        }
      }

      // 压缩图片
      if (compress) {
        try {
          processedPath = await compressImage(tempFilePath);
        } catch (err) {
          console.warn('图片压缩失败，使用原图:', err);
          // 压缩失败时使用原图
        }
      }

      processedImages.push(processedPath);
    }

    return processedImages;
  } catch (err) {
    console.error('选择并处理图片失败:', err);
    throw err;
  }
}

/**
 * 上传图片到云存储
 * @param {string} filePath 本地文件路径
 * @param {string} cloudPath 云存储路径
 * @param {Object} options 选项
 * @returns {Promise<Object>} 返回 {fileID, url}
 */
export async function uploadImageToCloud(filePath, cloudPath, options = {}) {
  const { compress = true } = options;

  try {
    // 压缩图片（如果需要）
    let uploadPath = filePath;
    if (compress) {
      try {
        uploadPath = await compressImage(filePath);
      } catch (err) {
        console.warn('压缩失败，使用原图上传:', err);
      }
    }

    // 上传到云存储
    const uploadResult = await new Promise((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath,
        filePath: uploadPath,
        success: resolve,
        fail: reject,
      });
    });

    // 获取临时URL
    const urlResult = await new Promise((resolve, reject) => {
      wx.cloud.getTempFileURL({
        fileList: [uploadResult.fileID],
        success: resolve,
        fail: reject,
      });
    });

    const url = urlResult.fileList[0]?.tempFileURL || '';

    // 缓存图片
    if (url) {
      await cacheImage(url, uploadResult.fileID);
    }

    return {
      fileID: uploadResult.fileID,
      url,
    };
  } catch (err) {
    console.error('上传图片失败:', err);
    throw err;
  }
}

/**
 * 获取图片信息
 * @param {string} src 图片路径或URL
 * @returns {Promise<Object>} 返回图片信息
 */
export async function getImageInfo(src) {
  try {
    const info = await new Promise((resolve, reject) => {
      wx.getImageInfo({
        src,
        success: resolve,
        fail: reject,
      });
    });

    return {
      width: info.width,
      height: info.height,
      path: info.path,
      type: info.type,
      orientation: info.orientation,
    };
  } catch (err) {
    console.error('获取图片信息失败:', err);
    throw err;
  }
}

/**
 * 预览图片
 * @param {Array<string>} urls 图片URL数组
 * @param {string} current 当前显示的图片URL
 */
export function previewImage(urls, current) {
  wx.previewImage({
    urls,
    current: current || urls[0],
  });
}

/**
 * 检查图片是否已缓存
 * @param {string} url 图片URL
 * @returns {Promise<boolean>}
 */
export async function checkImageCache(url) {
  return await isImageCached(url);
}

/**
 * 获取缓存的图片路径
 * @param {string} url 图片URL
 * @returns {Promise<string|null>}
 */
export async function getCachedImagePath(url) {
  return await getCachedImage(url);
}

/**
 * 图片预处理（验证+压缩）
 * @param {string} filePath 图片路径
 * @param {Object} options 选项
 * @returns {Promise<string>} 返回处理后的图片路径
 */
export async function preprocessImage(filePath, options = {}) {
  const {
    validate = true,
    compress = true,
    maxSize = IMAGE_CONFIG.maxFileSize,
  } = options;

  // 验证图片
  if (validate) {
    const validation = await validateImageFile(filePath, { maxSize });
    if (!validation.isValid) {
      throw new Error(validation.message);
    }
  }

  // 压缩图片
  if (compress) {
    try {
      return await compressImage(filePath, options);
    } catch (err) {
      console.warn('压缩失败，使用原图:', err);
      return filePath;
    }
  }

  return filePath;
}
