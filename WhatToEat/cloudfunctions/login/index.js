/**
 * 登录云函数
 * 用于获取用户openid和session_key
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

/**
 * 云函数入口函数
 * @param {Object} event 事件对象
 * @param {string} event.code 微信登录凭证code
 * @returns {Promise<Object>} 返回openid等信息
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { code } = event;

  try {
    // 如果传入了code，可以使用code换取openid（需要配置AppSecret）
    // 这里直接使用云函数自带的openid
    const openid = wxContext.OPENID;
    const appid = wxContext.APPID;
    const unionid = wxContext.UNIONID;

    return {
      errCode: 0,
      errMsg: 'success',
      data: {
        openid,
        appid,
        unionid,
      },
    };
  } catch (err) {
    console.error('登录云函数执行失败:', err);
    return {
      errCode: -1,
      errMsg: err.message || '登录失败',
      data: null,
    };
  }
};
