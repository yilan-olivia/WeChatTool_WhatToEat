/**
 * 智能食谱生成云函数配置
 */

module.exports = {
  // AI API配置
  aiApi: {
    type: process.env.AI_API_TYPE || 'openai',
    baseUrl: process.env.AI_API_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4',
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
