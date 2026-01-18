/**
 * 用户登录管理云函数
 * 处理用户登录、注册、信息更新
 */

const cloud = require('wx-server-sdk');
const { validate } = require('../common/validator');
const { info, error, logExecutionTime } = require('../common/logger');
const config = require('./config');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 创建或更新用户信息
 * @param {string} userId 用户ID
 * @param {Object} userInfo 用户信息
 * @returns {Promise<Object>}
 */
async function createOrUpdateUser(userId, userInfo = {}) {
  try {
    // 检查用户是否存在
    const userDoc = await db.collection('users').doc(userId).get();

    if (userDoc.data) {
      // 用户已存在，更新信息
      const updateData = {
        ...userInfo,
        updateTime: db.serverDate(),
        lastLoginTime: db.serverDate(),
      };

      // 只更新传入的字段
      const allowedFields = ['nickName', 'avatarUrl', 'gender', 'country', 'province', 'city', 'language', 'settings'];
      const filteredData = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });

      await db.collection('users').doc(userId).update({
        data: filteredData,
      });

      info('user-login', '更新用户信息', { userId }, userId);
      return { isNew: false, userId };
    } else {
      // 用户不存在，创建新用户
      const newUser = {
        _id: userId,
        nickName: userInfo.nickName || '微信用户',
        avatarUrl: userInfo.avatarUrl || '',
        gender: userInfo.gender || 0,
        country: userInfo.country || '',
        province: userInfo.province || '',
        city: userInfo.city || '',
        language: userInfo.language || 'zh_CN',
        settings: userInfo.settings || config.user.defaultSettings,
        statistics: config.user.defaultStatistics,
        isDeleted: false,
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        lastLoginTime: db.serverDate(),
      };

      await db.collection('users').add({
        data: newUser,
      });

      info('user-login', '创建新用户', { userId }, userId);
      return { isNew: true, userId };
    }
  } catch (err) {
    // 如果是文档不存在错误，尝试创建
    if (err.errCode === -1) {
      return await createOrUpdateUser(userId, userInfo);
    }
    throw err;
  }
}

/**
 * 获取用户信息
 * @param {string} userId 用户ID
 * @returns {Promise<Object>}
 */
async function getUserInfo(userId) {
  try {
    const result = await db.collection('users').doc(userId).get();
    if (!result.data || result.data.isDeleted) {
      throw new Error('用户不存在');
    }
    return result.data;
  } catch (err) {
    error('user-login', '获取用户信息失败', err, userId);
    throw err;
  }
}

/**
 * 更新用户设置
 * @param {string} userId 用户ID
 * @param {Object} settings 设置对象
 * @returns {Promise<Object>}
 */
async function updateUserSettings(userId, settings) {
  try {
    await db.collection('users').doc(userId).update({
      data: {
        settings: settings,
        updateTime: db.serverDate(),
      },
    });

    info('user-login', '更新用户设置', { userId, settings }, userId);
    return { success: true };
  } catch (err) {
    error('user-login', '更新用户设置失败', err, userId);
    throw err;
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  const { action, userInfo, settings } = event;

  return await logExecutionTime('user-login', async () => {
    try {
      if (!userId) {
        return {
          errCode: -1,
          errMsg: '用户未登录',
          data: null,
        };
      }

      switch (action) {
        case 'login':
          // 登录/注册
          const result = await createOrUpdateUser(userId, userInfo);
          const user = await getUserInfo(userId);
          
          return {
            errCode: 0,
            errMsg: 'success',
            data: {
              ...user,
              isNew: result.isNew,
            },
          };

        case 'get':
          // 获取用户信息
          const userInfo_data = await getUserInfo(userId);
          return {
            errCode: 0,
            errMsg: 'success',
            data: userInfo_data,
          };

        case 'update':
          // 更新用户信息
          const validation = validate(event, {
            userInfo: {
              type: 'object',
              required: true,
            },
          });

          if (!validation.isValid) {
            return {
              errCode: -1,
              errMsg: validation.errors[0].message,
              data: null,
            };
          }

          await createOrUpdateUser(userId, userInfo);
          const updatedUser = await getUserInfo(userId);
          
          return {
            errCode: 0,
            errMsg: 'success',
            data: updatedUser,
          };

        case 'updateSettings':
          // 更新用户设置
          if (!settings) {
            return {
              errCode: -1,
              errMsg: '设置数据不能为空',
              data: null,
            };
          }

          await updateUserSettings(userId, settings);
          const userWithSettings = await getUserInfo(userId);
          
          return {
            errCode: 0,
            errMsg: 'success',
            data: userWithSettings,
          };

        default:
          return {
            errCode: -1,
            errMsg: `不支持的操作: ${action}`,
            data: null,
          };
      }
    } catch (err) {
      error('user-login', '用户登录管理失败', err, userId);
      return {
        errCode: -1,
        errMsg: err.message || '操作失败',
        data: null,
      };
    }
  }, { userId });
};
