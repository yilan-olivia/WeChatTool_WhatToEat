/**
 * 食谱收藏页
 */
import { showToast } from '../../utils/util.js';
import { formatDate } from '../../utils/date.js';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    collectedRecipes: [], // 收藏的食谱列表
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadCollectedRecipes();
  },

  /**
   * 加载收藏的食谱
   */
  async loadCollectedRecipes() {
    this.setData({ loading: true });

    try {
      // 获取当前用户信息
      const userResult = await wx.cloud.callFunction({
        name: 'user-login',
        data: {
          action: 'get',
        },
      });

      if (userResult.result && userResult.result.errCode === 0) {
        const userInfo = userResult.result.data;
        const collectedRecipeIds = userInfo.collectedRecipes || [];

        if (collectedRecipeIds.length === 0) {
          this.setData({ collectedRecipes: [] });
          return;
        }

        // 查询收藏的食谱
        const db = wx.cloud.database();
        const result = await db.collection('recipes')
          .where({
            _id: db.command.in(collectedRecipeIds),
            isDeleted: false,
          })
          .orderBy('createTime', 'desc')
          .get();

        // 格式化时间
        const formattedRecipes = (result.data || []).map(recipe => ({
          ...recipe,
          createTime: this.formatTime(recipe.createTime),
        }));

        this.setData({ collectedRecipes: formattedRecipes });
      }
    } catch (err) {
      console.error('加载收藏食谱失败:', err);
      showToast('加载失败，请重试', 'none');
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 格式化时间
   */
  formatTime(time) {
    if (!time) return '';
    const date = new Date(time);
    return formatDate(date, 'YYYY-MM-DD');
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
});
