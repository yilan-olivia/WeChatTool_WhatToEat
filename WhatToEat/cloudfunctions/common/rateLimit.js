/**
 * 请求频率限制工具
 * 使用滑动窗口算法实现频率限制
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 频率限制配置
 */
const RATE_LIMIT_CONFIG = {
  // 不同云函数的限制配置
  'food-recognition': {
    window: 60 * 1000,      // 时间窗口：60秒
    maxRequests: 10,        // 最大请求数：10次
  },
  'recipe-generate': {
    window: 60 * 1000,
    maxRequests: 5,
  },
  'image-upload': {
    window: 60 * 1000,
    maxRequests: 20,
  },
  'community': {
    window: 60 * 1000,
    maxRequests: 30,
  },
  'default': {
    window: 60 * 1000,
    maxRequests: 10,
  },
};

/**
 * 检查请求频率
 * @param {string} functionName 云函数名称
 * @param {string} userId 用户ID
 * @returns {Promise<{allowed: boolean, remaining: number, resetTime: number}>}
 */
async function checkRateLimit(functionName, userId) {
  const config = RATE_LIMIT_CONFIG[functionName] || RATE_LIMIT_CONFIG.default;
  const now = Date.now();
  const windowStart = now - config.window;

  try {
    // 获取用户的请求记录
    const records = await db.collection('rate_limit_logs')
      .where({
        userId: userId,
        functionName: functionName,
        timestamp: db.command.gte(windowStart),
      })
      .orderBy('timestamp', 'desc')
      .get();

    // 计算当前窗口内的请求数
    const requestCount = records.data.length;

    // 检查是否超过限制
    if (requestCount >= config.maxRequests) {
      // 计算重置时间（最早请求的时间 + 窗口时间）
      const oldestRequest = records.data[records.data.length - 1];
      const resetTime = oldestRequest.timestamp + config.window;

      return {
        allowed: false,
        remaining: 0,
        resetTime: resetTime,
        message: `请求过于频繁，请在 ${Math.ceil((resetTime - now) / 1000)} 秒后重试`,
      };
    }

    // 记录本次请求
    await db.collection('rate_limit_logs').add({
      data: {
        userId: userId,
        functionName: functionName,
        timestamp: now,
        createTime: db.serverDate(),
      },
    });

    // 清理过期记录（异步执行，不阻塞当前请求）
    cleanExpiredRecords(functionName, userId, windowStart).catch(err => {
      console.error('清理过期记录失败:', err);
    });

    return {
      allowed: true,
      remaining: config.maxRequests - requestCount - 1,
      resetTime: now + config.window,
    };
  } catch (err) {
    console.error('频率限制检查失败:', err);
    // 出错时允许请求通过，避免影响正常功能
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: now + config.window,
    };
  }
}

/**
 * 清理过期记录
 * @param {string} functionName 云函数名称
 * @param {string} userId 用户ID
 * @param {number} windowStart 窗口开始时间
 */
async function cleanExpiredRecords(functionName, userId, windowStart) {
  try {
    const result = await db.collection('rate_limit_logs')
      .where({
        userId: userId,
        functionName: functionName,
        timestamp: db.command.lt(windowStart),
      })
      .remove();

    if (result.stats.removed > 0) {
      console.log(`清理了 ${result.stats.removed} 条过期记录`);
    }
  } catch (err) {
    console.error('清理过期记录失败:', err);
  }
}

/**
 * 获取用户剩余请求次数
 * @param {string} functionName 云函数名称
 * @param {string} userId 用户ID
 * @returns {Promise<number>}
 */
async function getRemainingRequests(functionName, userId) {
  const config = RATE_LIMIT_CONFIG[functionName] || RATE_LIMIT_CONFIG.default;
  const now = Date.now();
  const windowStart = now - config.window;

  try {
    const records = await db.collection('rate_limit_logs')
      .where({
        userId: userId,
        functionName: functionName,
        timestamp: db.command.gte(windowStart),
      })
      .count();

    const requestCount = records.total;
    return Math.max(0, config.maxRequests - requestCount);
  } catch (err) {
    console.error('获取剩余请求次数失败:', err);
    return config.maxRequests;
  }
}

module.exports = {
  checkRateLimit,
  getRemainingRequests,
  RATE_LIMIT_CONFIG,
};
