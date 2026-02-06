/**
 * 社区主页 - 显示食谱列表
 */
import { showToast } from '../../utils/util.js';
import { formatDate } from '../../utils/date.js';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    refreshing: false,
    loadingMore: false,
    hotRecipes: [], // 热门食谱Top5
    recipes: [], // 食谱列表
    page: 1, // 当前页码
    pageSize: 20, // 每页数量
    hasMore: true, // 是否还有更多数据
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
    // 刷新列表
    this.refreshList();
  },

  /**
   * 加载数据
   */
  async loadData(reset = false) {
    if (this.data.loading || this.data.loadingMore) return;

    if (reset) {
      this.setData({
        page: 1,
        recipes: [],
        hasMore: true,
      });
    }

    this.setData({ 
      loading: reset,
      loadingMore: !reset,
    });

    try {
      // 并行加载热门食谱和所有食谱
      const [hotResult, listResult] = await Promise.all([
        this.loadHotRecipes(),
        this.loadRecipesList(),
      ]);

      // 格式化时间和类型显示
      const formattedRecipes = listResult.map(recipe => ({
        ...recipe,
        createTime: this.formatTime(recipe.createTime),
        typeValue: this.formatTypeValue(recipe.typeCategory, recipe.typeValue),
      }));

      this.setData({
        hotRecipes: hotResult,
        recipes: reset ? formattedRecipes : [...this.data.recipes, ...formattedRecipes],
        hasMore: listResult.length === this.data.pageSize,
        page: this.data.page + 1,
      });
    } catch (err) {
      console.error('加载数据失败:', err);
      showToast('加载失败，请重试', 'none');
    } finally {
      this.setData({ 
        loading: false,
        loadingMore: false,
      });
    }
  },

  /**
   * 加载热门食谱Top5
   */
  async loadHotRecipes() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'community',
        data: {
          action: 'getHotRecipes',
        },
      });

      if (result.result && result.result.errCode === 0) {
        const recipes = result.result.data || [];
        // 格式化类型显示
        return recipes.map(recipe => ({
          ...recipe,
          typeValue: this.formatTypeValue(recipe.typeCategory, recipe.typeValue),
        }));
      }
      return [];
    } catch (err) {
      console.error('加载热门食谱失败:', err);
      return [];
    }
  },

  /**
   * 加载食谱列表
   */
  async loadRecipesList() {
    try {
      const db = wx.cloud.database();
      const result = await db.collection('recipes')
        .where({
          isDeleted: false,
          isPublic: true,
        })
        .orderBy('createTime', 'desc')
        .skip((this.data.page - 1) * this.data.pageSize)
        .limit(this.data.pageSize)
        .get();

      return result.data || [];
    } catch (err) {
      console.error('加载食谱列表失败:', err);
      return [];
    }
  },

  /**
   * 格式化时间
   */
  formatTime(time) {
    if (!time) return '';
    const date = new Date(time);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return formatDate(date, 'YYYY-MM-DD');
  },

  /**
   * 格式化类型值显示
   */
  formatTypeValue(typeCategory, typeValue) {
    if (!typeValue) return '';
    
    // 如果是饮食类型，需要将value转换为label
    if (typeCategory === 'dietType') {
      const dietTypeMap = {
        'balanced': '均衡饮食',
        'vegetarian': '素食',
        'low_carb': '低碳水',
        'high_protein': '高蛋白',
      };
      return dietTypeMap[typeValue] || typeValue;
    }
    
    // 如果是喜爱分类，直接返回（已经是中文）
    return typeValue;
  },

  /**
   * 刷新列表
   */
  refreshList() {
    this.loadData(true);
  },

  /**
   * 下拉刷新
   */
  onRefresh() {
    this.setData({ refreshing: true });
    this.loadData(true).finally(() => {
      this.setData({ refreshing: false });
    });
  },

  /**
   * 加载更多
   */
  onLoadMore() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadData();
    }
  },

  /**
   * 点击食谱项
   */
  onRecipeTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/community/detail?id=${id}`,
    });
  },

  /**
   * 导航到发布页
   */
  navigateToPublish() {
    wx.navigateTo({
      url: '/pages/community/publish',
    });
  },
});
