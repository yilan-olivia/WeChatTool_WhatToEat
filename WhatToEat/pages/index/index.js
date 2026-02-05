/**
 * 首页/仪表板
 */
import { queryData, countData, dbCollections, dbCommand, getStatistics } from '../../utils/db.js';
import { showToast } from '../../utils/util.js';
import { setCache, getCache, removeCache } from '../../utils/cache.js';
import { callCloudFunction } from '../../utils/request.js';

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

  async getUserId() {
    const userId = app.globalData.openid;
    if (userId) return userId;
    try {
      const result = await wx.cloud.callFunction({
        name: 'user-login',
        data: { action: 'login', userInfo: {} },
      });
      const data = result?.result?.data;
      const openid = data?._id || data?.openid || null;
      if (openid) {
        app.globalData.openid = openid;
        return openid;
      }
    } catch (err) {
      console.error('获取用户ID失败:', err);
    }
    return null;
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
  async onPullDownRefresh() {
    // 清除缓存，确保获取最新数据
    await Promise.all([
      removeCache('food_count'),
      removeCache('recipe_count'),
      removeCache('expiring_count'),
      removeCache('recent_foods'),
    ]);
    await this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载数据
   */
  async loadData() {
    this.setData({ loading: true });

    try {
      // 并行加载统计数据，即使某个失败也不影响其他数据
      await Promise.allSettled([
        this.loadFoodCount(),
        this.loadRecipeCount(),
        this.loadExpiringCount(),
        this.loadRecentFoods(),
      ]);
    } catch (err) {
      console.error('加载数据失败:', err);
      // 不显示错误提示，避免影响用户体验
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 加载菜品总数
   */
  async loadFoodCount() {
    try {
      const userId = await this.getUserId();
      if (!userId) {
        this.setData({ foodCount: 0 });
        return;
      }
      const cachedCount = await getCache('food_count');
      if (cachedCount !== null && cachedCount !== undefined) {
        this.setData({ foodCount: cachedCount });
      }

      const count = await countData(dbCollections.foods, { userId, isDeleted: false });
      this.setData({ foodCount: count });
      await setCache('food_count', count, 5 * 60 * 1000);
    } catch (err) {
      console.error('加载菜品总数失败:', err);
      this.setData({ foodCount: 0 });
    }
  },

  /**
   * 加载食谱数量
   */
  async loadRecipeCount() {
    try {
      const userId = await this.getUserId();
      if (!userId) {
        this.setData({ recipeCount: 0 });
        return;
      }
      const cachedCount = await getCache('recipe_count');
      if (cachedCount) {
        this.setData({ recipeCount: cachedCount });
        return;
      }
      const count = await countData(dbCollections.recipes, { userId, isDeleted: false });
      this.setData({ recipeCount: count });
      await setCache('recipe_count', count, 5 * 60 * 1000);
    } catch (err) {
      console.error('加载食谱数量失败:', err);
      this.setData({ recipeCount: 0 });
    }
  },

  /**
   * 加载即将过期的菜品数量
   */
  async loadExpiringCount() {
    try {
      const userId = await this.getUserId();
      if (!userId) {
        this.setData({ expiringCount: 0 });
        return;
      }
      const cachedCount = await getCache('expiring_count');
      if (cachedCount) {
        this.setData({ expiringCount: cachedCount });
        return;
      }

      const now = new Date();
      const threeDaysLater = new Date();
      threeDaysLater.setDate(now.getDate() + 3);

      const expiringFoods = await queryData(
        dbCollections.foods,
        {
          userId,
          expireDate: dbCommand.gte(now).and(dbCommand.lte(threeDaysLater)),
          isDeleted: false,
        }
      );

      this.setData({ expiringCount: expiringFoods.length });
      // 缓存数据，过期时间10分钟
      await setCache('expiring_count', expiringFoods.length, 10 * 60 * 1000);
    } catch (err) {
      console.error('加载即将过期菜品失败:', err);
      this.setData({ expiringCount: 0 });
    }
  },

  /**
   * 加载最近添加的菜品
   */
  async loadRecentFoods() {
    try {
      const userId = await this.getUserId();
      if (!userId) {
        this.setData({ recentFoods: [] });
        return;
      }
      const cachedFoods = await getCache('recent_foods');
      if (cachedFoods) {
        this.setData({ recentFoods: cachedFoods });
        return;
      }

      const recentFoods = await queryData(
        dbCollections.foods,
        { userId, isDeleted: false },
        {
          orderBy: { field: 'createTime', order: 'desc' },
          limit: 5
        }
      );
      this.setData({ recentFoods });
      await setCache('recent_foods', recentFoods, 5 * 60 * 1000);
    } catch (err) {
      console.error('加载最近菜品失败:', err);
      this.setData({ recentFoods: [] });
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


