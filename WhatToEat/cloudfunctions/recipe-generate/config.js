/**
 * 智能食谱生成云函数配置
 */

module.exports = {
  // AI API配置
  aiApi: {
    type: process.env.AI_API_TYPE || 'baidu',
    baseUrl: process.env.AI_API_BASE_URL || '',
    apiKey: process.env.AI_API_KEY || 'FGr3bm1CuoNMzYoq6N2k7bnz',
    secretKey: process.env.AI_API_SECRET_KEY || '7e39VsqCRowDdm6XYXY0En4jc3EfdwXY',
    model: process.env.AI_MODEL || 'ernie-bot-turbo',
    timeout: 60000, // 食谱生成可能需要更长时间
  },

  // 食谱生成配置
  recipe: {
    // 默认难度
    defaultDifficulty: '简单',
    // 默认制作时间
    defaultTime: '30分钟',
    // 支持的偏好
    preferences: ['清淡', '香辣', '酸甜', '咸鲜', '无要求'],
  },
};
