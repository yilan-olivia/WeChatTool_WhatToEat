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

        // 通过云函数查询收藏的食谱，避免权限问题
        const result = await wx.cloud.callFunction({
          name: 'community',
          data: {
            action: 'getCollectedRecipes',
            recipeIds: collectedRecipeIds,
          },
        });

        if (!result.result || result.result.errCode !== 0) {
          throw new Error(result.result?.errMsg || '获取收藏食谱失败');
        }

        const recipes = result.result.data || [];

        // 格式化时间和类型显示
        const formattedRecipes = recipes.map(recipe => ({
          ...recipe,
          createTime: this.formatTime(recipe.createTime),
          typeValue: this.formatTypeValue(recipe.typeCategory, recipe.typeValue),
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
   * 点击食谱项
   */
  onRecipeTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/community/detail?id=${id}`,
    });
  },
});
