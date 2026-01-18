/**
 * 首页/仪表板
 */
import { queryData, countData, dbCollections, dbCommand } from '../../utils/db.js';
import { showToast } from '../../utils/util.js';

const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    foodCount: 0, // 菜品总数
    recipeCount: 0, // 生成食谱数
    expiringCount: 0, // 即将过期数量
    recentFoods: [], // 最近添加的菜品
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadData();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示时刷新数据
    this.loadData();
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载数据
   */
  async loadData() {
    this.setData({ loading: true });

    try {
      // 并行加载统计数据
      await Promise.all([
        this.loadFoodCount(),
        this.loadRecipeCount(),
        this.loadExpiringCount(),
        this.loadRecentFoods(),
      ]);
    } catch (err) {
      console.error('加载数据失败:', err);
      showToast('加载失败，请重试', 'none');
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 加载菜品总数
   */
  async loadFoodCount() {
    try {
      const count = await countData(dbCollections.foods);
      this.setData({ foodCount: count });
    } catch (err) {
      console.error('加载菜品总数失败:', err);
    }
  },

  /**
   * 加载食谱数量
   */
  async loadRecipeCount() {
    try {
      const count = await countData(dbCollections.recipes);
      this.setData({ recipeCount: count });
    } catch (err) {
      console.error('加载食谱数量失败:', err);
    }
  },

  /**
   * 加载即将过期数量
   */
  async loadExpiringCount() {
    try {
      // 查询3天内过期的菜品
      const now = new Date();
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      
      const foods = await queryData(dbCollections.foods, {
        expireDate: dbCommand.lte(threeDaysLater),
        status: dbCommand.neq('expired'),
      });
      
      this.setData({ expiringCount: foods.length });
    } catch (err) {
      console.error('加载即将过期数量失败:', err);
    }
  },

  /**
   * 加载最近添加的菜品
   */
  async loadRecentFoods() {
    try {
      const foods = await queryData(
        dbCollections.foods,
        {},
        {
          orderBy: { field: 'createTime', order: 'desc' },
          limit: 5,
        }
      );
      this.setData({ recentFoods: foods });
    } catch (err) {
      console.error('加载最近菜品失败:', err);
    }
  },

  /**
   * 导航到菜品管理页
   */
  navigateToFoodManage() {
    wx.switchTab({
      url: '/pages/food-manage/food-manage',
    });
  },

  /**
   * 导航到拍照识别页
   */
  navigateToCameraScan() {
    wx.navigateTo({
      url: '/pages/camera-scan/camera-scan',
    });
  },

  /**
   * 导航到食谱生成页
   */
  navigateToRecipeGenerate() {
    wx.navigateTo({
      url: '/pages/recipe-generate/recipe-generate',
    });
  },

  /**
   * 导航到社区页
   */
  navigateToCommunity() {
    wx.switchTab({
      url: '/pages/community/community',
    });
  },

  /**
   * 导航到健康报告页
   */
  navigateToReport() {
    wx.navigateTo({
      url: '/pages/report/report',
    });
  },

  /**
   * 菜品卡片点击事件
   */
  onFoodTap(e) {
    const { food } = e.detail;
    // 可以跳转到菜品详情页（如果有）
    console.log('点击菜品:', food);
  },
});
