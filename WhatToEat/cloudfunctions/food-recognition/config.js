/**
 * 菜品识别云函数配置
 */

module.exports = {
  // AI API配置
  aiApi: {
    // API类型：openai, baidu-qianfan, ali-bailian等
    type: 'baidu-vision',
    // API基础地址
    baseUrl: 'https://aip.baidubce.com',
    // API密钥
    apiKey: 'ADsAgUKrzrVd4qW54V4UCs4x',
    // Secret Key
    secretKey: '4DaShhYbUZIpAyx7jtf7aak22v0CSQ1Q',
    // 菜品识别接口路径
    dishRecognitionPath: '/rest/2.0/image-classify/v2/dish',
    // 获取access_token接口路径
    accessTokenPath: '/oauth/2.0/token',
    // 请求超时时间（毫秒）
    timeout: 30000,
  },

  // 图片处理配置
  image: {
    // 最大文件大小（字节）
    maxFileSize: 10 * 1024 * 1024, // 10MB
    // 支持的格式
    supportedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  },

  // 识别结果配置
  recognition: {
    // 最小置信度
    minConfidence: 0.6,
    // 默认分类
    defaultCategory: '其他',
    // 低置信度警告阈值
    lowConfidenceThreshold: 0.7,
  },

  // 缓存配置
  cache: {
    // 是否启用缓存
    enabled: true,
    // 缓存集合名称
    collection: 'recognition_cache',
    // 缓存过期时间（毫秒，7天）
    expireTime: 7 * 24 * 60 * 60 * 1000,
  },
};