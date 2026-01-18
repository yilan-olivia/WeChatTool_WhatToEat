/**
 * 菜品识别云函数配置
 */

module.exports = {
  // AI API配置
  aiApi: {
    // API类型：openai, baidu-qianfan, ali-bailian等
    type: process.env.AI_API_TYPE || 'openai',
    // API基础地址
    baseUrl: process.env.AI_API_BASE_URL || 'https://api.openai.com/v1',
    // API密钥（从环境变量获取）
    apiKey: process.env.AI_API_KEY || '',
    // 百度千帆配置
    clientId: process.env.BAIDU_CLIENT_ID || '',
    clientSecret: process.env.BAIDU_CLIENT_SECRET || '',
    // 模型名称
    model: process.env.AI_MODEL || 'gpt-4-vision-preview',
    // 请求超时时间（毫秒）
    timeout: 30000,
    // 降级方案（按顺序尝试）
    fallbackTypes: process.env.AI_FALLBACK_TYPES ? process.env.AI_FALLBACK_TYPES.split(',') : [],
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
