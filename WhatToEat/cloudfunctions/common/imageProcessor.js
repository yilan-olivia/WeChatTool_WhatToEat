/**
 * 图片处理工具
 * 使用sharp库进行图片压缩和格式转换
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * 图片处理配置
 */
const IMAGE_CONFIG = {
  // 最大尺寸
  maxWidth: 1920,
  maxHeight: 1920,
  // 压缩质量（1-100）
  quality: 85,
  // 最大文件大小（字节）
  maxFileSize: 2 * 1024 * 1024, // 2MB
  // 支持的格式
  supportedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  // 输出格式
  outputFormat: 'jpeg',
};

/**
 * 压缩图片
 * @param {string} inputPath 输入文件路径
 * @param {string} outputPath 输出文件路径（可选）
 * @param {Object} options 压缩选项
 * @returns {Promise<{path: string, size: number, width: number, height: number}>}
 */
async function compressImage(inputPath, outputPath = null, options = {}) {
  const config = { ...IMAGE_CONFIG, ...options };

  try {
    // 读取图片元数据
    const metadata = await sharp(inputPath).metadata();
    const { width, height, format, size } = metadata;

    // 检查文件大小
    if (size > config.maxFileSize) {
      console.log(`图片文件过大: ${size} bytes，开始压缩`);
    }

    // 计算缩放比例
    let targetWidth = width;
    let targetHeight = height;

    if (width > config.maxWidth || height > config.maxHeight) {
      const ratio = Math.min(
        config.maxWidth / width,
        config.maxHeight / height
      );
      targetWidth = Math.round(width * ratio);
      targetHeight = Math.round(height * ratio);
    }

    // 生成输出路径
    if (!outputPath) {
      const ext = path.extname(inputPath);
      outputPath = inputPath.replace(ext, `_compressed.${config.outputFormat}`);
    }

    // 压缩图片
    await sharp(inputPath)
      .resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: config.quality })
      .toFile(outputPath);

    // 获取压缩后的文件大小
    const stats = fs.statSync(outputPath);
    const compressedSize = stats.size;

    console.log(`图片压缩完成: ${size} -> ${compressedSize} bytes (${((1 - compressedSize / size) * 100).toFixed(1)}% 压缩率)`);

    return {
      path: outputPath,
      size: compressedSize,
      width: targetWidth,
      height: targetHeight,
      originalSize: size,
      compressionRatio: (1 - compressedSize / size) * 100,
    };
  } catch (err) {
    console.error('图片压缩失败:', err);
    throw new Error(`图片压缩失败: ${err.message}`);
  }
}

/**
 * 转换图片格式
 * @param {string} inputPath 输入文件路径
 * @param {string} outputFormat 输出格式（jpg/png/webp）
 * @param {string} outputPath 输出文件路径（可选）
 * @returns {Promise<string>}
 */
async function convertImageFormat(inputPath, outputFormat = 'jpeg', outputPath = null) {
  try {
    if (!outputPath) {
      const ext = path.extname(inputPath);
      outputPath = inputPath.replace(ext, `.${outputFormat}`);
    }

    await sharp(inputPath)
      .toFormat(outputFormat)
      .toFile(outputPath);

    return outputPath;
  } catch (err) {
    console.error('图片格式转换失败:', err);
    throw new Error(`图片格式转换失败: ${err.message}`);
  }
}

/**
 * 生成缩略图
 * @param {string} inputPath 输入文件路径
 * @param {number} width 缩略图宽度
 * @param {number} height 缩略图高度
 * @param {string} outputPath 输出文件路径（可选）
 * @returns {Promise<string>}
 */
async function generateThumbnail(inputPath, width = 200, height = 200, outputPath = null) {
  try {
    if (!outputPath) {
      const ext = path.extname(inputPath);
      outputPath = inputPath.replace(ext, `_thumb${ext}`);
    }

    await sharp(inputPath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    return outputPath;
  } catch (err) {
    console.error('生成缩略图失败:', err);
    throw new Error(`生成缩略图失败: ${err.message}`);
  }
}

/**
 * 验证图片文件
 * @param {string} filePath 文件路径
 * @returns {Promise<boolean>}
 */
async function validateImage(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    
    // 检查格式
    if (!IMAGE_CONFIG.supportedFormats.includes(metadata.format.toLowerCase())) {
      throw new Error(`不支持的图片格式: ${metadata.format}`);
    }

    // 检查文件大小
    const stats = fs.statSync(filePath);
    if (stats.size > IMAGE_CONFIG.maxFileSize * 2) {
      throw new Error(`图片文件过大: ${stats.size} bytes`);
    }

    return true;
  } catch (err) {
    console.error('图片验证失败:', err);
    throw err;
  }
}

/**
 * 获取图片信息
 * @param {string} filePath 文件路径
 * @returns {Promise<Object>}
 */
async function getImageInfo(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    const stats = fs.statSync(filePath);

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: stats.size,
      hasAlpha: metadata.hasAlpha,
    };
  } catch (err) {
    console.error('获取图片信息失败:', err);
    throw new Error(`获取图片信息失败: ${err.message}`);
  }
}

module.exports = {
  compressImage,
  convertImageFormat,
  generateThumbnail,
  validateImage,
  getImageInfo,
  IMAGE_CONFIG,
};
