/**
 * API接口配置
 * 用于后续集成AI大模型API等外部服务
 */

/**
 * AI大模型API配置（预留）
 * 后续可配置OpenAI、文心一言、通义千问等API
 */
export const aiApiConfig = {
  // API基础地址
  baseUrl: '',
  // API密钥（建议通过云函数调用，避免暴露）
  apiKey: '',
  // 请求超时时间（毫秒）
  timeout: 30000,
  // 模型名称
  model: '',
};

/**
 * 其他第三方API配置
 */
export const thirdPartyApi = {
  // 图片识别API（如需要）
  imageRecognition: {
    baseUrl: '',
    apiKey: '',
  },
};

/**
 * 云函数名称配置
 */
export const cloudFunctions = {
  login: 'login', // 登录云函数
  aiRecipe: 'ai-recipe', // AI食谱生成云函数
  imageRecognition: 'food-recognition', // 图片识别云函数
};