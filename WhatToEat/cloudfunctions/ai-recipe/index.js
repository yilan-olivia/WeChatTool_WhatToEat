/**
 * AI食谱生成云函数
 * 用于调用AI大模型API生成智能食谱
 * 
 * 使用说明：
 * 1. 在云函数中配置AI API密钥（通过环境变量或云函数配置）
 * 2. 根据实际使用的AI服务（OpenAI、文心一言、通义千问等）修改调用逻辑
 * 3. 安装相应的npm包（如axios用于HTTP请求）
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

/**
 * 云函数入口函数
 * @param {Object} event 事件对象
 * @param {Array<string>} event.foods 菜品名称数组
 * @param {string} event.preference 口味偏好
 * @returns {Promise<Object>} 返回生成的食谱
 */
exports.main = async (event, context) => {
  const { foods, preference } = event;

  try {
    // 参数验证
    if (!foods || !Array.isArray(foods) || foods.length === 0) {
      return {
        errCode: -1,
        errMsg: '菜品列表不能为空',
        data: null,
      };
    }

    // TODO: 在这里实现AI API调用逻辑
    // 示例：调用OpenAI API
    // const axios = require('axios');
    // const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    //   model: 'gpt-3.5-turbo',
    //   messages: [
    //     {
    //       role: 'system',
    //       content: '你是一个专业的厨师，擅长根据现有食材生成详细的食谱。',
    //     },
    //     {
    //       role: 'user',
    //       content: `请根据以下食材：${foods.join('、')}，生成一份${preference}口味的详细食谱。`,
    //     },
    //   ],
    // }, {
    //   headers: {
    //     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    // });

    // 模拟返回数据（实际应该从AI API返回）
    const mockRecipe = {
      name: `${foods.join('、')} 炒菜`,
      difficulty: '简单',
      time: '30分钟',
      calories: '350',
      ingredients: foods,
      steps: [
        '将选中的菜品清洗干净，切好备用',
        '热锅下油，放入调料爆香',
        '依次加入菜品，翻炒均匀',
        '加入适量调味料，炒至熟透即可',
      ],
    };

    return {
      errCode: 0,
      errMsg: 'success',
      data: mockRecipe,
    };
  } catch (err) {
    console.error('AI食谱生成失败:', err);
    return {
      errCode: -1,
      errMsg: err.message || '生成失败',
      data: null,
    };
  }
};
