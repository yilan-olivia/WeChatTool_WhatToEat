/**
 * 用户登录管理云函数
 * 处理用户登录、注册、信息更新
 */

const cloud = require('wx-server-sdk');
// const { validate } = require('../common/validator'); // 暂时移除，避免部署问题
// const { info, error, logExecutionTime } = require('../common/logger'); // 暂时移除，避免部署问题
const config = require('./config');

// 简单的日志函数
const info = (module, message, data, userId) => {
  console.log(`[${module}] ${message}`, data || '', userId || '');
};

const error = (module, message, err, userId) => {
  console.error(`[${module}] ${message}`, err, userId || '');
};

const logExecutionTime = async (module, fn, context) => {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    console.log(`[${module}] 执行耗时: ${duration}ms`);
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`[${module}] 执行失败，耗时: ${duration}ms`, err);
    throw err;
  }
};

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
    let userDoc;
    try {
      userDoc = await db.collection('users').doc(userId).get();
    } catch (err) {
      // 如果获取失败，假设用户不存在
      userDoc = { data: null };
    }

    if (userDoc.data && !userDoc.data.isDeleted) {
      // 用户已存在，更新信息
      const updateData = {
        updateTime: db.serverDate(),
        lastLoginTime: db.serverDate(),
      };

      // 只更新传入的字段
      const allowedFields = ['nickName', 'avatarUrl', 'gender', 'country', 'province', 'city', 'language', 'settings'];
      allowedFields.forEach(field => {
        if (userInfo[field] !== undefined) {
          updateData[field] = userInfo[field];
        }
      });

      await db.collection('users').doc(userId).update({
        data: updateData,
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

      try {
        await db.collection('users').add({
          data: newUser,
        });
      } catch (addErr) {
        // 如果添加失败（可能是文档已存在），尝试更新
        if (addErr.errCode === -1 || addErr.errMsg && addErr.errMsg.includes('duplicate')) {
          await db.collection('users').doc(userId).update({
            data: {
              ...newUser,
              updateTime: db.serverDate(),
              lastLoginTime: db.serverDate(),
            },
          });
        } else {
          throw addErr;
        }
      }

      info('user-login', '创建新用户', { userId }, userId);
      return { isNew: true, userId };
    }
  } catch (err) {
    error('user-login', '创建或更新用户失败', err, userId);
    throw err;
  }
}

/**
 * 获取用户信息
 * @param {string} userId 用户ID
 * @returns {Promise<Object|null>}
 */
async function getUserInfo(userId) {
  try {
    const result = await db.collection('users').doc(userId).get();
    if (!result.data || result.data.isDeleted) {
      return null; // 返回null而不是抛出错误
    }
    return result.data;
  } catch (err) {
    error('user-login', '获取用户信息失败', err, userId);
    // 如果是文档不存在，返回null
    if (err.errCode === -1 || err.errMsg && err.errMsg.includes('not found')) {
      return null;
    }
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
  const { action, userInfo, settings, recipeId } = event;

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
        case 'login': {
          // 登录/注册
          const result = await createOrUpdateUser(userId, userInfo || {});
          const loginUser = await getUserInfo(userId);
          
          if (!loginUser) {
            return {
              errCode: -1,
              errMsg: '创建用户失败',
              data: null,
            };
          }
          
          return {
            errCode: 0,
            errMsg: 'success',
            data: {
              ...loginUser,
              isNew: result.isNew,
            },
          };
        }

        case 'get':
          // 获取用户信息
          const userInfo_data = await getUserInfo(userId);
          if (!userInfo_data) {
            return {
              errCode: -1,
              errMsg: '用户不存在',
              data: null,
            };
          }
          return {
            errCode: 0,
            errMsg: 'success',
            data: userInfo_data,
          };

        case 'update':
          // 更新用户信息
          if (!userInfo || typeof userInfo !== 'object') {
            return {
              errCode: -1,
              errMsg: '用户信息不能为空',
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

        case 'collectRecipe': {
          // 收藏/取消收藏食谱
          const recipeId = event.recipeId;
          if (!recipeId) {
            return {
              errCode: -1,
              errMsg: '参数错误：缺少recipeId',
              data: null,
            };
          }

          const collectUser = await getUserInfo(userId);
          if (!collectUser) {
            return {
              errCode: -1,
              errMsg: '用户不存在',
              data: null,
            };
          }

          const collectedRecipes = collectUser.collectedRecipes || [];
          const isCollected = collectedRecipes.includes(recipeId);

          // 更新收藏列表
          let newCollectedRecipes;
          if (isCollected) {
            // 取消收藏
            newCollectedRecipes = collectedRecipes.filter(id => id !== recipeId);
          } else {
            // 添加收藏
            newCollectedRecipes = [...collectedRecipes, recipeId];
          }

          await db.collection('users').doc(userId).update({
            data: {
              collectedRecipes: newCollectedRecipes,
              updateTime: db.serverDate(),
            },
          });

          // 更新食谱的收藏数
          const recipeDoc = await db.collection('recipes').doc(recipeId).get();
          if (recipeDoc.data) {
            const currentCount = recipeDoc.data.collectCount || 0;
            await db.collection('recipes').doc(recipeId).update({
              data: {
                collectCount: isCollected ? currentCount - 1 : currentCount + 1,
                updateTime: db.serverDate(),
              },
            });
          }

          const updatedUser = await getUserInfo(userId);
          
          return {
            errCode: 0,
            errMsg: 'success',
            data: {
              ...updatedUser,
              isCollected: !isCollected,
            },
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
      error('user-login', '用户登录管理失败', err, userId);
      return {
        errCode: -1,
        errMsg: err.message || '操作失败',
        data: null,
      };
    }
  }, { userId });
};
