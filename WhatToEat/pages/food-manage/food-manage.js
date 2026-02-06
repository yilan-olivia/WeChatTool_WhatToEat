/**
 * 菜品管理页
 */
import { queryData, deleteData, updateData, dbCollections, dbCommand } from '../../utils/db.js';
import { showToast, showModal, showSuccess, showError } from '../../utils/util.js';
import { removeCache } from '../../utils/cache.js';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    refreshing: false,
    loadingMore: false,
    searchKeyword: '', // 搜索关键词
    currentCategory: '全部', // 当前分类
    categories: ['全部', '蔬菜', '水果', '肉类', '海鲜', '调料', '其他'], // 分类列表
    foods: [], // 菜品列表
    page: 1, // 当前页码
    pageSize: 10, // 每页数量
    hasMore: true, // 是否还有更多数据
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadFoods();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 刷新列表
    this.refreshList();
  },

  /**
   * 加载菜品列表
   */
  async loadFoods(reset = false) {
    if (this.data.loading || this.data.loadingMore) return;

    if (reset) {
      this.setData({
        page: 1,
        foods: [],
        hasMore: true,
      });
    }

    this.setData({ 
      loading: reset,
      loadingMore: !reset,
    });

    try {
      // 构建查询条件
      const app = getApp();
      let userId = app.globalData.openid;
      if (!userId) {
        try {
          const result = await wx.cloud.callFunction({
            name: 'user-login',
            data: { action: 'login', userInfo: {} },
          });
          const data = result?.result?.data;
          userId = data?._id || data?.openid || null;
          if (userId) app.globalData.openid = userId;
        } catch (e) {}
      }
      const where = { isDeleted: false };
      if (userId) where.userId = userId;
      
      // 搜索条件
      if (this.data.searchKeyword) {
        where.name = new RegExp(this.data.searchKeyword, 'i');
      }
      
      // 分类条件
      if (this.data.currentCategory && this.data.currentCategory !== '全部') {
        where.category = this.data.currentCategory;
      }

      // 查询数据
      const foods = await queryData(
        dbCollections.foods,
        where,
        {
          orderBy: { field: 'createTime', order: 'desc' },
          limit: this.data.pageSize,
          skip: (this.data.page - 1) * this.data.pageSize,
        }
      );

      // 更新数据
      this.setData({
        foods: reset ? foods : [...this.data.foods, ...foods],
        hasMore: foods.length === this.data.pageSize,
        page: this.data.page + 1,
      });
    } catch (err) {
      console.error('加载菜品失败:', err);
      showError('加载失败，请重试');
    } finally {
      this.setData({ 
        loading: false,
        loadingMore: false,
      });
    }
  },

  /**
   * 刷新列表
   */
  refreshList() {
    this.loadFoods(true);
  },

  /**
   * 下拉刷新
   */
  onRefresh() {
    this.setData({ refreshing: true });
    this.loadFoods(true).finally(() => {
      this.setData({ refreshing: false });
    });
  },

  /**
   * 加载更多
   */
  onLoadMore() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadFoods();
    }
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value,
    });
  },

  /**
   * 执行搜索
   */
  onSearch() {
    this.loadFoods(true);
  },

  /**
   * 分类切换
   */
  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category;
    if (category === this.data.currentCategory) return;

    this.setData({
      currentCategory: category,
    });
    this.loadFoods(true);
  },

  /**
   * 菜品卡片点击
   */
  onFoodTap(e) {
    console.log('onFoodTap triggered:', e);
    const { food } = e.detail;
    console.log('Food data:', food);
    if (food && food._id) {
      // 跳转到菜品编辑页
      wx.navigateTo({
        url: `/pages/food-edit/food-edit?id=${food._id}`,
      });
    } else {
      console.error('Food data is invalid:', food);
      wx.showToast({
        title: '菜品数据错误',
        icon: 'error'
      });
    }
  },

  /**
   * 菜品卡片长按
   */
  async onFoodLongPress(e) {
    const { food } = e.detail;
    
    // 显示确认删除对话框
    const result = await showModal(
      `确定要删除菜品「${food.name}」吗？`,
      '删除确认',
      {
        confirmText: '删除',
        cancelText: '取消',
      }
    );
    
    if (!result.confirm) return;

    try {
      console.log('[food-manage] 开始删除菜品:', food._id);
      await updateData(dbCollections.foods, food._id, { isDeleted: true });
      console.log('[food-manage] 菜品删除成功，开始清除缓存');
      
      await Promise.all([
        removeCache('food_count'),
        removeCache('expiring_count'),
        removeCache('recent_foods'),
      ]);
      
      console.log('[food-manage] 缓存清除完成');
      showSuccess('删除成功');
      this.refreshList();
    } catch (err) {
      console.error('[food-manage] 删除菜品失败:', err);
      showError('删除失败，请重试');
    }
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
   * 导航到菜品编辑页（添加新菜品）
   */
  navigateToFoodEdit() {
    wx.navigateTo({
      url: '/pages/food-edit/food-edit',
    });
  },
});
