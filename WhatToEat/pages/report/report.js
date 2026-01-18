/**
 * 健康报告页
 */
import { queryData, countData, dbCollections, dbCommand } from '../../utils/db.js';
import { showToast, formatDate } from '../../utils/util.js';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    startDate: '', // 开始日期
    endDate: '', // 结束日期
    minDate: '', // 最小日期
    maxDate: '', // 最大日期
    reportData: null, // 报告数据
    categoryNutritionData: [], // 分类营养数据（用于nutrition-bar组件）
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 初始化日期范围（默认最近7天）
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    this.setData({
      startDate: formatDate(sevenDaysAgo, 'YYYY-MM-DD'),
      endDate: formatDate(today, 'YYYY-MM-DD'),
      minDate: '2020-01-01', // 可以根据实际情况设置
      maxDate: formatDate(today, 'YYYY-MM-DD'),
    });

    // 自动查询
    this.queryReport();
  },

  /**
   * 开始日期改变
   */
  onStartDateChange(e) {
    this.setData({
      startDate: e.detail.value,
    });
  },

  /**
   * 结束日期改变
   */
  onEndDateChange(e) {
    this.setData({
      endDate: e.detail.value,
    });
  },

  /**
   * 查询报告
   */
  async queryReport() {
    if (!this.data.startDate || !this.data.endDate) {
      showToast('请选择日期范围', 'none');
      return;
    }

    this.setData({ loading: true });

    try {
      const startDate = new Date(this.data.startDate);
      const endDate = new Date(this.data.endDate);
      endDate.setHours(23, 59, 59, 999); // 设置为当天的最后一刻

      // 并行查询各项数据
      const [foods, recipes, expiredFoods] = await Promise.all([
        this.loadFoodsInRange(startDate, endDate),
        this.loadRecipesInRange(startDate, endDate),
        this.loadExpiredFoodsInRange(startDate, endDate),
      ]);

      // 计算统计数据
      const categoryStats = this.calculateCategoryStats(foods);
      const avgCalories = this.calculateAvgCalories(recipes);

      // 生成健康建议
      const tips = this.generateHealthTips(foods, recipes, categoryStats);

      // 转换分类统计数据为nutrition-bar组件需要的格式
      const categoryNutritionData = categoryStats.map(item => ({
        name: item.category,
        type: item.category,
        value: item.count,
        unit: '个',
        percentage: item.percentage,
      }));

      this.setData({
        reportData: {
          totalFoods: foods.length,
          totalRecipes: recipes.length,
          avgCalories: avgCalories.toFixed(0),
          wasteCount: expiredFoods.length,
          categoryStats,
          tips,
        },
        categoryNutritionData: categoryNutritionData,
      });
    } catch (err) {
      console.error('查询报告失败:', err);
      showToast('查询失败，请重试', 'none');
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 加载日期范围内的菜品
   */
  async loadFoodsInRange(startDate, endDate) {
    try {
      const foods = await queryData(
        dbCollections.foods,
        {
          createTime: dbCommand.gte(startDate).and(dbCommand.lte(endDate)),
        }
      );
      return foods;
    } catch (err) {
      console.error('加载菜品失败:', err);
      return [];
    }
  },

  /**
   * 加载日期范围内的食谱
   */
  async loadRecipesInRange(startDate, endDate) {
    try {
      const recipes = await queryData(
        dbCollections.recipes,
        {
          createTime: dbCommand.gte(startDate).and(dbCommand.lte(endDate)),
        }
      );
      return recipes;
    } catch (err) {
      console.error('加载食谱失败:', err);
      return [];
    }
  },

  /**
   * 加载日期范围内过期的菜品
   */
  async loadExpiredFoodsInRange(startDate, endDate) {
    try {
      const foods = await queryData(
        dbCollections.foods,
        {
          status: 'expired',
          updateTime: dbCommand.gte(startDate).and(dbCommand.lte(endDate)),
        }
      );
      return foods;
    } catch (err) {
      console.error('加载过期菜品失败:', err);
      return [];
    }
  },

  /**
   * 计算分类统计
   */
  calculateCategoryStats(foods) {
    const categoryMap = {};
    let total = 0;

    foods.forEach(food => {
      const category = food.category || '其他';
      categoryMap[category] = (categoryMap[category] || 0) + 1;
      total++;
    });

    return Object.keys(categoryMap).map(category => ({
      category,
      count: categoryMap[category],
      percentage: total > 0 ? (categoryMap[category] / total) * 100 : 0,
    }));
  },

  /**
   * 计算平均热量
   */
  calculateAvgCalories(recipes) {
    if (recipes.length === 0) return 0;
    
    const totalCalories = recipes.reduce((sum, recipe) => {
      const calories = parseFloat(recipe.calories) || 0;
      return sum + calories;
    }, 0);

    return totalCalories / recipes.length;
  },

  /**
   * 生成健康建议
   */
  generateHealthTips(foods, recipes, categoryStats) {
    const tips = [];

    // 检查菜品多样性
    if (categoryStats.length < 3) {
      tips.push('建议增加菜品多样性，保证营养均衡');
    }

    // 检查浪费情况
    const expiredCount = foods.filter(f => f.status === 'expired').length;
    if (expiredCount > 0) {
      tips.push(`本周有${expiredCount}个菜品过期，建议合理规划采购和食用计划`);
    }

    // 检查食谱生成频率
    if (recipes.length === 0) {
      tips.push('建议多使用食谱生成功能，尝试新的菜品搭配');
    }

    // 检查蔬菜摄入
    const vegetableCount = categoryStats.find(s => s.category === '蔬菜')?.count || 0;
    if (vegetableCount < foods.length * 0.3) {
      tips.push('建议增加蔬菜类菜品的摄入，保持健康饮食');
    }

    if (tips.length === 0) {
      tips.push('您的饮食管理很棒，继续保持！');
    }

    return tips;
  },
});
