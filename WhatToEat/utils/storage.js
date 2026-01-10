/**
 * 本地存储工具
 * 封装微信小程序本地存储相关方法
 */

/**
 * 存储数据到本地
 * @param {string} key 存储的键名
 * @param {any} data 要存储的数据
 * @returns {Promise<void>}
 */
export const setStorage = (key, data) => {
  return new Promise((resolve, reject) => {
    wx.setStorage({
      key,
      data,
      success: () => {
        resolve();
      },
      fail: (err) => {
        reject(err);
      },
    });
  });
};

/**
 * 从本地获取数据
 * @param {string} key 存储的键名
 * @returns {Promise<any>} 返回存储的数据
 */
export const getStorage = (key) => {
  return new Promise((resolve, reject) => {
    wx.getStorage({
      key,
      success: (res) => {
        resolve(res.data);
      },
      fail: (err) => {
        // 如果key不存在，返回null而不是reject
        if (err.errMsg.includes('not found')) {
          resolve(null);
        } else {
          reject(err);
        }
      },
    });
  });
};

/**
 * 删除本地存储的数据
 * @param {string} key 存储的键名
 * @returns {Promise<void>}
 */
export const removeStorage = (key) => {
  return new Promise((resolve, reject) => {
    wx.removeStorage({
      key,
      success: () => {
        resolve();
      },
      fail: (err) => {
        reject(err);
      },
    });
  });
};

/**
 * 清空所有本地存储
 * @returns {Promise<void>}
 */
export const clearStorage = () => {
  return new Promise((resolve, reject) => {
    wx.clearStorage({
      success: () => {
        resolve();
      },
      fail: (err) => {
        reject(err);
      },
    });
  });
};

/**
 * 获取本地存储信息
 * @returns {Promise<Object>} 返回存储信息对象
 */
export const getStorageInfo = () => {
  return new Promise((resolve, reject) => {
    wx.getStorageInfo({
      success: (res) => {
        resolve(res);
      },
      fail: (err) => {
        reject(err);
      },
    });
  });
};

// 存储键名常量
export const STORAGE_KEYS = {
  USER_INFO: 'userInfo', // 用户信息
  LOGIN_CODE: 'loginCode', // 登录凭证
  SETTINGS: 'settings', // 用户设置
  FOOD_CACHE: 'foodCache', // 菜品缓存
};
