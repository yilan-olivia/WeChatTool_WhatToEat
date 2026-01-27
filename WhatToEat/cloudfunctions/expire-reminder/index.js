/**
 * 过期提醒云函数
 * 检查即将过期的菜品并发送订阅消息提醒
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// 从环境变量或配置中获取模板ID（如果配置了的话）
// 注意：实际使用时，模板ID应该从配置中获取或作为参数传入
const DEFAULT_TEMPLATE_ID = ''; // 可以在这里设置默认模板ID，但建议通过参数传入

/**
 * 发送订阅消息
 * @param {string} openid 用户openid
 * @param {string} templateId 模板ID
 * @param {Object} data 消息数据
 */
async function sendSubscribeMessage(openid, templateId, data) {
  try {
    if (!templateId) {
      throw new Error('模板ID不能为空');
    }

    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      template_id: templateId, // 注意：API使用的是template_id而不是templateId
      page: 'pages/food-manage/food-manage', // 点击消息跳转的页面
      data: data,
      miniprogram_state: 'developer', // 开发版：'developer'，体验版：'trial'，正式版：'formal'
    });
    
    console.log('订阅消息发送成功:', result);
    return result;
  } catch (err) {
    console.error('发送订阅消息失败:', err);
    // 如果是用户拒绝订阅，不抛出错误，只记录日志
    if (err.errCode === 43101) {
      console.log('用户拒绝订阅消息');
      return { errCode: 43101, errMsg: '用户拒绝订阅' };
    }
    throw err;
  }
}

/**
 * 获取即将过期的菜品
 * @param {string} userId 用户ID
 * @param {number} days 提前天数
 * @returns {Promise<Array>}
 */
async function getExpiringFoods(userId, days) {
  try {
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + days);
    
    // 设置时间范围：从今天到目标日期
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const result = await db.collection('food_items')
      .where({
        userId,
        isDeleted: false,
        expireDate: _.exists(true), // 必须有保质期
      })
      .get();

    // 过滤出在指定天数内过期的菜品
    const expiringFoods = result.data.filter(food => {
      if (!food.expireDate) return false;
      const expireDate = new Date(food.expireDate);
      const daysDiff = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff <= days;
    });

    return expiringFoods;
  } catch (err) {
    console.error('获取过期菜品失败:', err);
    return [];
  }
}

/**
 * 格式化日期为中文格式
 * @param {Date} date 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
}

/**
 * 检查单个用户的过期菜品并发送提醒
 * @param {string} userId 用户ID
 * @param {string} templateId 模板ID
 * @returns {Promise<Object>}
 */
async function checkAndSendForUser(userId, templateId) {
  try {
    // 获取用户设置
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.data) {
      return {
        success: false,
        message: '用户不存在',
      };
    }

    const user = userDoc.data;
    const expireReminder = user.settings?.notifications?.expireReminder || 'none';

    if (expireReminder === 'none') {
      return {
        success: true,
        message: '用户未开启过期提醒',
      };
    }

    // 根据设置确定检查天数
    let checkDays = 0;
    if (expireReminder === '3days') {
      checkDays = 3;
    } else if (expireReminder === '1day') {
      checkDays = 1;
    }

    // 获取即将过期的菜品
    const expiringFoods = await getExpiringFoods(userId, checkDays);

    if (expiringFoods.length === 0) {
      return {
        success: true,
        message: '没有即将过期的菜品',
      };
    }

    // 构建消息内容
    // 根据模板关键词：物资名称、剩余天数
    // 模板字段通常对应：thing1（物资名称）、number1（剩余天数）
    
    const foodNames = expiringFoods.map(food => food.name).join('、');
    
    // 计算最早过期的日期和剩余天数
    const now = new Date();
    const earliestExpireDate = expiringFoods
      .map(food => food.expireDate ? new Date(food.expireDate) : null)
      .filter(date => date !== null)
      .sort((a, b) => a - b)[0];
    
    let remainingDays = checkDays;
    if (earliestExpireDate) {
      const daysDiff = Math.ceil((earliestExpireDate - now) / (1000 * 60 * 60 * 24));
      remainingDays = daysDiff > 0 ? daysDiff : 0;
    }

    // 根据模板字段构建消息数据
    // 模板关键词：物资名称、剩余天数
    // 注意：如果模板字段名不同，请根据实际模板调整字段名
    const messageData = {
      thing1: { 
        // 物资名称（最多20个字符）
        value: foodNames.length > 20 ? foodNames.substring(0, 17) + '...' : foodNames 
      },
      number2: { 
        // 剩余天数
        value: remainingDays.toString()
      },
    };
    
    // 如果只有一个菜品，显示菜品名称
    if (expiringFoods.length === 1) {
      const food = expiringFoods[0];
      messageData.thing1.value = food.name.length > 20 ? food.name.substring(0, 17) + '...' : food.name;
    }

    // 发送订阅消息
    if (templateId) {
      try {
        await sendSubscribeMessage(userId, templateId, messageData);
        return {
          success: true,
          message: '提醒发送成功',
          count: expiringFoods.length,
        };
      } catch (err) {
        console.error(`发送提醒失败 (用户: ${userId}):`, err);
        return {
          success: false,
          message: `发送失败: ${err.message}`,
          count: expiringFoods.length,
        };
      }
    } else {
      return {
        success: false,
        message: '模板ID未配置',
        count: expiringFoods.length,
      };
    }
  } catch (err) {
    console.error(`检查用户过期菜品失败 (用户: ${userId}):`, err);
    return {
      success: false,
      message: err.message || '检查失败',
    };
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, templateId, userId } = event;

  try {
    // 使用传入的模板ID或默认模板ID
    const finalTemplateId = templateId || DEFAULT_TEMPLATE_ID;

    if (action === 'checkAndSend') {
      // 检查并发送提醒（单个用户，由前端调用）
      const currentUserId = userId || wxContext.OPENID;
      
      if (!currentUserId) {
        return {
          errCode: -1,
          errMsg: '用户未登录',
          data: null,
        };
      }

      const result = await checkAndSendForUser(currentUserId, finalTemplateId);

      return {
        errCode: result.success ? 0 : -1,
        errMsg: result.message || (result.success ? 'success' : 'failed'),
        data: {
          count: result.count || 0,
        },
      };
    } else if (action === 'checkAllUsers') {
      // 检查所有用户并发送提醒（定时任务调用）
      if (!finalTemplateId) {
        return {
          errCode: -1,
          errMsg: '模板ID未配置',
          data: null,
        };
      }

      // 获取所有开启了过期提醒的用户
      const usersResult = await db.collection('users')
        .where({
          'settings.notifications.expireReminder': _.neq('none'),
          isDeleted: false,
        })
        .get();

      const users = usersResult.data;
      console.log(`找到 ${users.length} 个开启了过期提醒的用户`);

      const results = [];
      let successCount = 0;
      let failCount = 0;

      // 遍历所有用户，检查并发送提醒
      for (const user of users) {
        const result = await checkAndSendForUser(user._id, finalTemplateId);
        results.push({
          userId: user._id,
          ...result,
        });

        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }

        // 避免请求过快，添加小延迟
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return {
        errCode: 0,
        errMsg: 'success',
        data: {
          total: users.length,
          success: successCount,
          failed: failCount,
          results: results,
        },
      };
    } else {
      return {
        errCode: -1,
        errMsg: `不支持的操作: ${action}`,
        data: null,
      };
    }
  } catch (err) {
    console.error('过期提醒云函数错误:', err);
    return {
      errCode: -1,
      errMsg: err.message || '操作失败',
      data: null,
    };
  }
};
