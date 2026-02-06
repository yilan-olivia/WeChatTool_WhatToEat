/**
 * 统计数据云函数
 * 用于获取各种统计数据，避免前端直接访问数据库的权限问题
 */

const cloud = require('wx-server-sdk');
const config = require('./config');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

/**
 * 统计菜品数量
 * @param {string} userId 用户ID（用于权限验证）
 * @returns {Promise<number>}
 */
async function countFoods(userId) {
  try {
    const result = await db
      .collection(config.collections.foods)
      .where({
        userId: userId,
        isDeleted: _.neq(true),
      })
      .count();
    return result.total || 0;
  } catch (err) {
    console.error('[statistics] 统计菜品数量失败:', err);
    throw err;
  }
}

/**
 * 统计食谱数量
 * @param {string} userId 用户ID（用于权限验证）
 * @returns {Promise<number>}
 */
async function countRecipes(userId) {
  try {
    const result = await db
      .collection(config.collections.recipes)
      .where({
        userId: userId,
        isDeleted: _.neq(true),
      })
      .count();
    return result.total || 0;
  } catch (err) {
    console.error('[statistics] 统计食谱数量失败:', err);
    throw err;
  }
}

/**
 * 统计即将过期的菜品数量
 * @param {string} userId 用户ID（用于权限验证）
 * @param {number} days 天数（默认3天）
 * @returns {Promise<number>}
 */
async function countExpiringFoods(userId, days = 3) {
  try {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + days);

    const nowStr = formatDate(now, 'YYYY-MM-DD');
    const endDateStr = formatDate(endDate, 'YYYY-MM-DD');

    const result = await db
      .collection(config.collections.foods)
      .where({
        userId: userId,
        isDeleted: _.neq(true),
        expireDate: _.gte(nowStr).and(_.lte(endDateStr)),
      })
      .count();
    return result.total || 0;
  } catch (err) {
    console.error('[statistics] 统计即将过期菜品数量失败:', err);
    throw err;
  }
}

function formatDate(date, format = 'YYYY-MM-DD') {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day);
}

// 测试函数
function testDateComparison() {
  const today = new Date('2026-02-06');
  const tomorrow = new Date('2026-02-07');
  const threeDaysLater = new Date('2026-02-09');
  
  const todayStr = formatDate(today, 'YYYY-MM-DD');
  const tomorrowStr = formatDate(tomorrow, 'YYYY-MM-DD');
  const threeDaysLaterStr = formatDate(threeDaysLater, 'YYYY-MM-DD');
  
  console.log('Test dates:');
  console.log('Today:', todayStr);
  console.log('Tomorrow:', tomorrowStr);
  console.log('Three days later:', threeDaysLaterStr);
  
  // Test if tomorrow is between today and three days later
  const isBetween = tomorrowStr >= todayStr && tomorrowStr <= threeDaysLaterStr;
  console.log('Tomorrow is between today and three days later:', isBetween);
}

/**
 * 获取最近添加的菜品
 * @param {string} userId 用户ID（用于权限验证）
 * @param {number} limit 数量限制（默认5条）
 * @returns {Promise<Array>}
 */
async function getRecentFoods(userId, limit = 5) {
  try {
    const result = await db
      .collection(config.collections.foods)
      .where({
        userId: userId,
        isDeleted: _.neq(true),
      })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();
    return result.data || [];
  } catch (err) {
    console.error('[statistics] 获取最近菜品失败:', err);
    throw err;
  }
}

/**
 * 获取所有统计数据
 * @param {string} userId 用户ID
 * @returns {Promise<Object>}
 */
async function getAllStatistics(userId) {
  try {
    const [foodCount, recipeCount, expiringCount, recentFoods] = await Promise.all([
      countFoods(userId),
      countRecipes(userId),
      countExpiringFoods(userId, 3),
      getRecentFoods(userId, 5),
    ]);

    return {
      foodCount,
      recipeCount,
      expiringCount,
      recentFoods,
    };
  } catch (err) {
    console.error('[statistics] 获取所有统计数据失败:', err);
    throw err;
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  const { action, days, limit } = event;

  // 测试日期比较逻辑
  testDateComparison();

  console.log('[statistics] 请求参数:', { action, userId, days, limit });

  if (!userId) {
    return {
      errCode: -1,
      errMsg: '用户未登录',
      data: null,
    };
  }

  try {
    switch (action) {
      case 'countFoods': {
        const count = await countFoods(userId);
        return {
          errCode: 0,
          errMsg: 'success',
          data: count,
        };
      }

      case 'countRecipes': {
        const count = await countRecipes(userId);
        return {
          errCode: 0,
          errMsg: 'success',
          data: count,
        };
      }

      case 'countExpiringFoods': {
        const count = await countExpiringFoods(userId, days || 3);
        return {
          errCode: 0,
          errMsg: 'success',
          data: count,
        };
      }

      case 'getRecentFoods': {
        const foods = await getRecentFoods(userId, limit || 5);
        return {
          errCode: 0,
          errMsg: 'success',
          data: foods,
        };
      }

      case 'getAll': {
        const stats = await getAllStatistics(userId);
        return {
          errCode: 0,
          errMsg: 'success',
          data: stats,
        };
      }

      default:
        return {
          errCode: -1,
          errMsg: `不支持的操作: ${action}`,
          data: null,
        };
    }
  } catch (err) {
    console.error('[statistics] 云函数执行失败:', err);
    return {
      errCode: -1,
      errMsg: err.message || '操作失败',
      data: null,
    };
  }
};
