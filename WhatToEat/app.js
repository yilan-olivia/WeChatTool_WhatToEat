/**
 * 应用入口文件
 * 处理应用生命周期、云开发初始化、用户授权等
 */

import { cloudConfig } from './config/env.js';
import { getLoginCode, checkLoginStatus } from './utils/auth.js';
import { setStorage, getStorage, STORAGE_KEYS } from './utils/storage.js';
import { showToast } from './utils/util.js';

App({
  /**
   * 全局数据
   */
  globalData: {
    userInfo: null, // 用户信息
    openid: null, // 用户openid
    isLogin: false, // 登录状态
  },

  /**
   * 应用启动时执行
   */
  onLaunch(options) {
    console.log('小程序启动', options);
    
    // 初始化云开发
    this.initCloud();
    
    // 检查登录状态
    this.checkLogin();
    
    // 检查更新
    this.checkUpdate();
  },

  /**
   * 应用显示时执行
   */
  onShow(options) {
    console.log('小程序显示', options);
  },

  /**
   * 应用隐藏时执行
   */
  onHide() {
    console.log('小程序隐藏');
  },

  /**
   * 应用错误时执行
   */
  onError(msg) {
    console.error('小程序错误:', msg);
    // 可以在这里上报错误日志
  },

  /**
   * 页面不存在时执行
   */
  onPageNotFound(res) {
    console.warn('页面不存在:', res);
    wx.redirectTo({
      url: '/pages/index/index',
    });
  },

  /**
   * 初始化云开发
   */
  initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      showToast('云开发初始化失败', 'none');
      return;
    }

    // 初始化云开发环境
    wx.cloud.init({
      env: cloudConfig.env, // 云开发环境ID
      traceUser: cloudConfig.traceUser,
    });

    console.log('云开发初始化成功');
  },

  /**
   * 检查登录状态
   */
  async checkLogin() {
    try {
      // 从本地存储获取用户信息
      const userInfo = await getStorage(STORAGE_KEYS.USER_INFO);
      if (userInfo) {
        this.globalData.userInfo = userInfo;
        this.globalData.isLogin = true;
      }

      // 检查登录凭证是否有效
      const isLogin = await checkLoginStatus();
      if (!isLogin) {
        // 重新获取登录凭证
        await this.login();
      }
    } catch (err) {
      console.error('检查登录状态失败:', err);
    }
  },

  /**
   * 用户登录
   */
  async login() {
    try {
      // 获取登录凭证
      const code = await getLoginCode();
      await setStorage(STORAGE_KEYS.LOGIN_CODE, code);

      // 调用云函数获取openid（如果有登录云函数）
      // const result = await callCloudFunction('login', { code });
      // if (result && result.openid) {
      //   this.globalData.openid = result.openid;
      //   this.globalData.isLogin = true;
      // }

      console.log('登录成功');
    } catch (err) {
      console.error('登录失败:', err);
      showToast('登录失败，请重试', 'none');
    }
  },

  /**
   * 检查小程序更新
   */
  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          console.log('发现新版本');
        }
      });

      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          },
        });
      });

      updateManager.onUpdateFailed(() => {
        console.error('新版本下载失败');
      });
    }
  },

  /**
   * 设置用户信息
   */
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.isLogin = true;
    setStorage(STORAGE_KEYS.USER_INFO, userInfo);
  },

  /**
   * 清除用户信息（退出登录）
   */
  clearUserInfo() {
    this.globalData.userInfo = null;
    this.globalData.openid = null;
    this.globalData.isLogin = false;
    // 清除本地存储的用户信息
    // removeStorage(STORAGE_KEYS.USER_INFO);
  },
});
