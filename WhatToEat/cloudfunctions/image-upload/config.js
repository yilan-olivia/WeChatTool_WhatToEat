/**
 * 图片上传处理云函数配置
 */

module.exports = {
  // 图片处理配置
  image: {
    // 最大文件大小（字节）
    maxFileSize: 10 * 1024 * 1024, // 10MB
    // 压缩质量（1-100）
    quality: 85,
    // 最大尺寸
    maxWidth: 1920,
    maxHeight: 1920,
    // 支持的格式
    supportedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    // 输出格式
    outputFormat: 'jpeg',
  },

  // 存储路径配置
  storage: {
    // 基础路径
    basePath: 'images',
    // 不同类型图片的路径
    paths: {
      food: 'foods',
      recipe: 'recipes',
      avatar: 'avatars',
    },
  },
};
