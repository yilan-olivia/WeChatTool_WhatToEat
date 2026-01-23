/**
 * 用户授权登录工具
 * 封装微信小程序用户授权相关方法
 */

/**
 * 获取用户登录凭证
 * @returns {Promise<string>} 返回code，用于换取openid和session_key
 */
export const getLoginCode = () => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          resolve(res.code);
        } else {
          reject(new Error('获取登录凭证失败'));
        }
      },
      fail: (err) => {
        reject(err);
      },
    });
  });
};

/**
 * 获取用户信息（需要用户授权）
 * @returns {Promise<Object>} 返回用户信息对象
 */
export const getUserProfile = () => {
  return new Promise((resolve, reject) => {
    // 使用wx.getUserInfo获取用户信息
    wx.getUserInfo({
      success: (res) => {
        resolve(res.userInfo);
      },
      fail: (err) => {
        // 如果失败，检查是否是因为未授权
        wx.getSetting({
          success: (res) => {
            if (!res.authSetting['scope.userInfo']) {
              // 未授权，需要通过button组件的open-type="getUserInfo"来获取授权
              reject(new Error('需要用户授权才能获取个人信息，请点击授权按钮'));
            } else {
              reject(err);
            }
          },
          fail: (err) => {
            reject(err);
          },
        });
      },
    });
  });
};

/**
 * 检查用户授权状态
 * @param {string} scope 授权范围，如 'scope.userInfo'
 * @returns {Promise<boolean>} 返回是否已授权
 */
export const checkAuthSetting = (scope) => {
  return new Promise((resolve) => {
    wx.getSetting({
      success: (res) => {
        resolve(res.authSetting[scope] === true);
      },
      fail: () => {
        resolve(false);
      },
    });
  });
};

/**
 * 打开授权设置页面
 */
export const openSetting = () => {
  return new Promise((resolve, reject) => {
    wx.openSetting({
      success: (res) => {
        resolve(res.authSetting);
      },
      fail: (err) => {
        reject(err);
      },
    });
  });
};

/**
 * 检查登录状态
 * @returns {Promise<boolean>} 返回是否已登录
 */
export const checkLoginStatus = async () => {
  try {
    const code = await getLoginCode();
    return !!code;
  } catch (err) {
    console.error('检查登录状态失败:', err);
    return false;
  }
};
