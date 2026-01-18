/**
 * 统一的多服务商AI API调用封装
 * 支持OpenAI、百度千帆、阿里百炼等
 */

const axios = require('axios');
const crypto = require('crypto');

/**
 * 将图片URL转换为base64
 * @param {string} imageUrl 图片URL
 * @returns {Promise<string>} base64字符串
 */
async function urlToBase64(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    const buffer = Buffer.from(response.data, 'binary');
    const base64 = buffer.toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (err) {
    throw new Error(`图片转换失败: ${err.message}`);
  }
}

/**
 * 计算图片hash（用于缓存）
 * @param {string} imageUrl 图片URL
 * @returns {Promise<string>} hash值
 */
async function calculateImageHash(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    const hash = crypto.createHash('md5').update(response.data).digest('hex');
    return hash;
  } catch (err) {
    // 如果获取失败，使用URL作为hash
    return crypto.createHash('md5').update(imageUrl).digest('hex');
  }
}

/**
 * 使用OpenAI API识别图片
 * @param {string} imageUrl 图片URL
 * @param {Object} apiConfig API配置
 * @returns {Promise<Object>} 识别结果
 */
async function recognizeWithOpenAI(imageUrl, apiConfig) {
  const response = await axios.post(
    `${apiConfig.baseUrl}/chat/completions`,
    {
      model: apiConfig.model || 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的菜品识别系统。请识别图片中的菜品，返回JSON格式：{"name": "菜品名称", "category": "分类", "confidence": 0.95}',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请识别这张图片中的菜品，返回JSON格式：{"name": "菜品名称", "category": "分类（蔬菜/水果/肉类/海鲜/调料/其他）", "confidence": 置信度（0-1）}',
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    },
    {
      headers: {
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: apiConfig.timeout || 30000,
    }
  );

  const content = response.data.choices[0].message.content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const result = JSON.parse(jsonMatch[0]);
    return {
      name: result.name || '',
      category: result.category || '其他',
      confidence: result.confidence || 0.8,
    };
  }

  throw new Error('无法解析AI响应');
}

/**
 * 使用百度千帆API识别图片
 * @param {string} imageUrl 图片URL
 * @param {Object} apiConfig API配置
 * @returns {Promise<Object>} 识别结果
 */
async function recognizeWithBaiduQianfan(imageUrl, apiConfig) {
  try {
    // 获取access_token
    const tokenResponse = await axios.post(
      `https://aip.baidubce.com/oauth/2.0/token`,
      null,
      {
        params: {
          grant_type: 'client_credentials',
          client_id: apiConfig.clientId || apiConfig.apiKey,
          client_secret: apiConfig.clientSecret || apiConfig.secretKey,
        },
        timeout: 10000,
      }
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      throw new Error('获取百度access_token失败');
    }

    // 将图片URL转换为base64
    const base64Image = await urlToBase64(imageUrl);

    // 调用文心大模型API
    const modelResponse = await axios.post(
      `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie-vilg-v2`,
      {
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请识别这张图片中的菜品，返回JSON格式：{"name": "菜品名称", "category": "分类（蔬菜/水果/肉类/海鲜/调料/其他）", "confidence": 置信度（0-1）}',
              },
              {
                type: 'image_url',
                image_url: base64Image,
              },
            ],
          },
        ],
      },
      {
        params: {
          access_token: accessToken,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: apiConfig.timeout || 30000,
      }
    );

    const content = modelResponse.data.result;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        name: result.name || '',
        category: result.category || '其他',
        confidence: result.confidence || 0.8,
      };
    }

    throw new Error('无法解析百度API响应');
  } catch (err) {
    throw new Error(`百度千帆API调用失败: ${err.message}`);
  }
}

/**
 * 使用阿里百炼API识别图片
 * @param {string} imageUrl 图片URL
 * @param {Object} apiConfig API配置
 * @returns {Promise<Object>} 识别结果
 */
async function recognizeWithAliBailian(imageUrl, apiConfig) {
  try {
    // 将图片URL转换为base64
    const base64Image = await urlToBase64(imageUrl);

    // 调用通义千问多模态API
    const response = await axios.post(
      `${apiConfig.baseUrl || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'}`,
      {
        model: apiConfig.model || 'qwen-vl-max',
        input: {
          messages: [
            {
              role: 'user',
              content: [
                {
                  text: '请识别这张图片中的菜品，返回JSON格式：{"name": "菜品名称", "category": "分类（蔬菜/水果/肉类/海鲜/调料/其他）", "confidence": 置信度（0-1）}',
                },
                {
                  image: base64Image,
                },
              ],
            },
          ],
        },
        parameters: {
          temperature: 0.3,
          max_tokens: 200,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${apiConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: apiConfig.timeout || 30000,
      }
    );

    const content = response.data.output.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        name: result.name || '',
        category: result.category || '其他',
        confidence: result.confidence || 0.8,
      };
    }

    throw new Error('无法解析阿里百炼API响应');
  } catch (err) {
    throw new Error(`阿里百炼API调用失败: ${err.message}`);
  }
}

/**
 * 统一调用AI API识别图片
 * @param {string} imageUrl 图片URL
 * @param {Object} apiConfig API配置
 * @param {Array<string>} fallbackTypes 降级方案（按顺序尝试）
 * @returns {Promise<Object>} 识别结果
 */
async function recognizeImage(imageUrl, apiConfig, fallbackTypes = []) {
  const apiType = apiConfig.type || 'openai';
  const allTypes = [apiType, ...fallbackTypes];

  for (const type of allTypes) {
    try {
      let result;
      switch (type) {
        case 'openai':
          result = await recognizeWithOpenAI(imageUrl, apiConfig);
          break;
        case 'baidu':
        case 'baidu-qianfan':
          result = await recognizeWithBaiduQianfan(imageUrl, apiConfig);
          break;
        case 'alibaba':
        case 'ali-bailian':
          result = await recognizeWithAliBailian(imageUrl, apiConfig);
          break;
        default:
          throw new Error(`不支持的API类型: ${type}`);
      }

      // 验证结果
      if (result && result.name && result.confidence) {
        return result;
      }
    } catch (err) {
      // 如果当前类型失败，尝试下一个
      console.warn(`API类型 ${type} 调用失败:`, err.message);
      if (type === allTypes[allTypes.length - 1]) {
        // 最后一个也失败了，抛出错误
        throw err;
      }
      continue;
    }
  }

  throw new Error('所有API调用都失败');
}

/**
 * 生成食谱（使用AI）
 * @param {Array<string>} foods 食材列表
 * @param {string} preference 偏好
 * @param {Object} apiConfig API配置
 * @returns {Promise<Object>} 生成的食谱
 */
async function generateRecipe(foods, preference, apiConfig) {
  const prompt = `请根据以下食材：${foods.join('、')}，生成一份${preference}口味的详细食谱。

要求：
1. 食谱名称要吸引人
2. 难度：简单/中等/困难
3. 制作时间：如"30分钟"
4. 估算热量（卡路里）
5. 详细的食材清单（包含用量）
6. 详细的制作步骤（至少4步）
7. 营养成分：蛋白质（g）、脂肪（g）、碳水化合物（g）

请以JSON格式返回：
{
  "name": "食谱名称",
  "difficulty": "简单",
  "time": "30分钟",
  "calories": 350,
  "protein": 20,
  "fat": 10,
  "carbs": 30,
  "ingredients": ["食材1 用量", "食材2 用量"],
  "steps": ["步骤1", "步骤2", "步骤3", "步骤4"]
}`;

  const apiType = apiConfig.type || 'openai';

  try {
    let response;
    if (apiType === 'openai') {
      response = await axios.post(
        `${apiConfig.baseUrl}/chat/completions`,
        {
          model: apiConfig.model || 'gpt-4',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的厨师，擅长根据现有食材生成详细的食谱。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: apiConfig.timeout || 60000,
        }
      );
    } else if (apiType === 'baidu' || apiType === 'baidu-qianfan') {
      // 百度千帆生成食谱
      const tokenResponse = await axios.post(
        `https://aip.baidubce.com/oauth/2.0/token`,
        null,
        {
          params: {
            grant_type: 'client_credentials',
            client_id: apiConfig.clientId || apiConfig.apiKey,
            client_secret: apiConfig.clientSecret || apiConfig.secretKey,
          },
        }
      );
      const accessToken = tokenResponse.data.access_token;

      response = await axios.post(
        `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie-bot-turbo`,
        {
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          params: { access_token: accessToken },
          headers: { 'Content-Type': 'application/json' },
          timeout: apiConfig.timeout || 60000,
        }
      );
    } else {
      throw new Error(`不支持的API类型: ${apiType}`);
    }

    const content = apiType === 'openai'
      ? response.data.choices[0].message.content
      : response.data.result;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('无法解析AI响应');
  } catch (err) {
    throw new Error(`生成食谱失败: ${err.message}`);
  }
}

module.exports = {
  recognizeImage,
  generateRecipe,
  urlToBase64,
  calculateImageHash,
  recognizeWithOpenAI,
  recognizeWithBaiduQianfan,
  recognizeWithAliBailian,
};
