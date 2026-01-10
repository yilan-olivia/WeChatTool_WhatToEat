/**
 * 个人中心页
 */
import { getUserProfile } from '../../utils/auth.js';
import { countData, dbCollections } from '../../utils/db.js';
import { showToast, showModal } from '../../utils/util.js';

const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    userInfo: {}, // 用户信息
    isLogin: false, // 登录状态
    foodCount: 0, // 菜品数量
    recipeCount: 0, // 食谱数量
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadUserInfo();
    this.loadCounts();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 刷新用户信息和统计数据
    this.loadUserInfo();
    this.loadCounts();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = app.globalData.userInfo;
    const isLogin = app.globalData.isLogin;

    this.setData({
      userInfo: userInfo || {},
      isLogin,
    });
  },

  /**
   * 加载统计数据
   */
  async loadCounts() {
    try {
      const [foodCount, recipeCount] = await Promise.all([
        countData(dbCollections.foods),
        countData(dbCollections.recipes),
      ]);

      this.setData({
        foodCount,
        recipeCount,
      });
    } catch (err) {
      console.error('加载统计数据失败:', err);
    }
  },

  /**
   * 用户信息点击
   */
  async onUserInfoTap() {
    if (this.data.isLogin) {
      // 已登录，可以跳转到编辑资料页
      wx.showModal({
        title: '提示',
        content: '编辑资料功能开发中...',
        showCancel: false,
      });
    } else {
      // 未登录，请求授权
      await this.login();
    }
  },

  /**
   * 登录
   */
  async login() {
    try {
      const userInfo = await getUserProfile();
      
      // 保存用户信息
      app.setUserInfo(userInfo);
      this.setData({
        userInfo,
        isLogin: true,
      });

      showToast('登录成功', 'success');
    } catch (err) {
      console.error('登录失败:', err);
      if (err.errMsg && !err.errMsg.includes('cancel')) {
        showToast('登录失败，请重试', 'none');
      }
    }
  },

  /**
   * 导航到菜品管理
   */
  navigateToFoodManage() {
    wx.switchTab({
      url: '/pages/food-manage/food-manage',
    });
  },

  /**
   * 导航到食谱列表
   */
  navigateToRecipes() {
    wx.showModal({
      title: '提示',
      content: '我的食谱功能开发中...',
      showCancel: false,
    });
  },

  /**
   * 导航到健康报告
   */
  navigateToReport() {
    wx.navigateTo({
      url: '/pages/report/report',
    });
  },

  /**
   * 设置点击
   */
  onSettingsTap() {
    wx.showModal({
      title: '提示',
      content: '设置功能开发中...',
      showCancel: false,
    });
  },

  /**
   * 关于我们点击
   */
  onAboutTap() {
    wx.showModal({
      title: '关于我们',
      content: '家庭菜品管理与智能食谱\n\n一款帮助您管理家庭菜品、生成智能食谱的小程序。',
      showCancel: false,
    });
  },

  /**
   * 退出登录
   */
  async onLogout() {
    const confirm = await showModal('确定要退出登录吗？', '提示');
    if (confirm) {
      app.clearUserInfo();
      this.setData({
        userInfo: {},
        isLogin: false,
      });
      showToast('已退出登录', 'success');
    }
  },
});
