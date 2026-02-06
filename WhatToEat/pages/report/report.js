/**
 * 健康报告页
 */
import { showToast } from '../../utils/util.js';
import { formatDate } from '../../utils/date.js';

const app = getApp();

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
    dailyCalories: [], // 每日卡路里数据
    weeklyCalories: 0, // 每周卡路里总数
    nutritionBalance: null, // 营养均衡情况
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    this.setData({
      startDate: formatDate(sevenDaysAgo, 'YYYY-MM-DD'),
      endDate: formatDate(today, 'YYYY-MM-DD'),
      minDate: '2020-01-01',
      maxDate: formatDate(today, 'YYYY-MM-DD'),
    });

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
      const result = await wx.cloud.callFunction({
        name: 'health-report-statistics',
        data: {
          startDate: this.data.startDate,
          endDate: this.data.endDate,
        },
      });

      if (result.result.errCode !== 0) {
        showToast(result.result.errMsg || '查询失败', 'none');
        return;
      }

      const data = result.result.data;
      
      this.setData({
        reportData: data.reportData,
        categoryNutritionData: data.categoryNutritionData,
        dailyCalories: data.dailyCalories,
        weeklyCalories: data.weeklyCalories,
        nutritionBalance: data.nutritionBalance,
      });
    } catch (err) {
      console.error('查询报告失败:', err);
      showToast('查询失败，请重试', 'none');
    } finally {
      this.setData({ loading: false });
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
   * 计算每日卡路里
   */
  calculateDailyCalories(recipes, startDate, endDate) {
    const dailyMap = {};
    
    // 初始化日期范围内的所有日期
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    while (currentDate <= end) {
      const dateKey = formatDate(currentDate, 'YYYY-MM-DD');
      dailyMap[dateKey] = 0;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 统计每日卡路里
    recipes.forEach(recipe => {
      if (recipe.createTime) {
        const recipeDate = new Date(recipe.createTime);
        const dateKey = formatDate(recipeDate, 'YYYY-MM-DD');
        const calories = parseFloat(recipe.calories) || 0;
        if (dailyMap.hasOwnProperty(dateKey)) {
          dailyMap[dateKey] += calories;
        }
      }
    });

    // 转换为数组格式，按日期排序
    return Object.keys(dailyMap)
      .sort()
      .map(date => ({
        date: date,
        calories: Math.round(dailyMap[date]),
      }));
  },

  /**
   * 计算每周卡路里
   */
  calculateWeeklyCalories(recipes, startDate, endDate) {
    // 计算日期范围内的总卡路里
    const totalCalories = recipes.reduce((sum, recipe) => {
      const calories = parseFloat(recipe.calories) || 0;
      return sum + calories;
    }, 0);

    return Math.round(totalCalories);
  },

  /**
   * 计算营养均衡情况
   */
  calculateNutritionBalance(recipes, days = 7) {
    if (recipes.length === 0) {
      return {
        score: 0,
        level: '暂无数据',
        protein: { value: 0, target: 60, percentage: 0, status: '不足', statusClass: 'insufficient' },
        fat: { value: 0, target: 65, percentage: 0, status: '不足', statusClass: 'insufficient' },
        carbs: { value: 0, target: 300, percentage: 0, status: '不足', statusClass: 'insufficient' },
        calories: { value: 0, target: 2000, percentage: 0, status: '不足', statusClass: 'insufficient' },
      };
    }

    // 计算总营养摄入
    const totalNutrition = recipes.reduce((sum, recipe) => {
      return {
        calories: sum.calories + (parseFloat(recipe.calories) || 0),
        protein: sum.protein + (parseFloat(recipe.protein) || 0),
        fat: sum.fat + (parseFloat(recipe.fat) || 0),
        carbs: sum.carbs + (parseFloat(recipe.carbs) || 0),
      };
    }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

    // 计算平均值（根据实际天数）
    const avgNutrition = {
      calories: Math.round(totalNutrition.calories / days),
      protein: Math.round((totalNutrition.protein / days) * 10) / 10,
      fat: Math.round((totalNutrition.fat / days) * 10) / 10,
      carbs: Math.round((totalNutrition.carbs / days) * 10) / 10,
    };

    // 目标值（每日推荐量）
    const targets = {
      calories: 2000,
      protein: 60, // 克
      fat: 65, // 克
      carbs: 300, // 克
    };

    // 计算各项指标状态
    const calculateStatus = (value, target) => {
      const percentage = (value / target) * 100;
      if (percentage < 80) return { text: '不足', class: 'insufficient' };
      if (percentage > 120) return { text: '过量', class: 'excessive' };
      return { text: '正常', class: 'normal' };
    };

    const proteinStatus = calculateStatus(avgNutrition.protein, targets.protein);
    const fatStatus = calculateStatus(avgNutrition.fat, targets.fat);
    const carbsStatus = calculateStatus(avgNutrition.carbs, targets.carbs);
    const caloriesStatus = calculateStatus(avgNutrition.calories, targets.calories);

    // 计算综合评分（0-100）
    const scores = {
      protein: Math.min(100, (avgNutrition.protein / targets.protein) * 100),
      fat: Math.max(0, 100 - Math.abs(avgNutrition.fat - targets.fat) / targets.fat * 100),
      carbs: Math.max(0, 100 - Math.abs(avgNutrition.carbs - targets.carbs) / targets.carbs * 100),
      calories: Math.max(0, 100 - Math.abs(avgNutrition.calories - targets.calories) / targets.calories * 100),
    };

    const totalScore = Math.round(
      scores.protein * 0.3 +
      scores.fat * 0.2 +
      scores.carbs * 0.2 +
      scores.calories * 0.3
    );

    // 确定等级
    let level = '优秀';
    if (totalScore < 60) {
      level = '需改善';
    } else if (totalScore < 80) {
      level = '良好';
    }

    return {
      score: totalScore,
      level: level,
      protein: {
        value: avgNutrition.protein,
        target: targets.protein,
        percentage: Math.round((avgNutrition.protein / targets.protein) * 100),
        status: proteinStatus.text,
        statusClass: proteinStatus.class,
      },
      fat: {
        value: avgNutrition.fat,
        target: targets.fat,
        percentage: Math.round((avgNutrition.fat / targets.fat) * 100),
        status: fatStatus.text,
        statusClass: fatStatus.class,
      },
      carbs: {
        value: avgNutrition.carbs,
        target: targets.carbs,
        percentage: Math.round((avgNutrition.carbs / targets.carbs) * 100),
        status: carbsStatus.text,
        statusClass: carbsStatus.class,
      },
      calories: {
        value: avgNutrition.calories,
        target: targets.calories,
        percentage: Math.round((avgNutrition.calories / targets.calories) * 100),
        status: caloriesStatus.text,
        statusClass: caloriesStatus.class,
      },
    };
  },

  /**
   * 生成健康建议
   */
  generateHealthTips(foods, recipes, categoryStats, nutritionBalance) {
    const tips = [];

    // 检查营养均衡
    if (nutritionBalance) {
      if (nutritionBalance.score < 60) {
        tips.push('营养均衡评分较低，建议调整饮食结构');
      }
      if (nutritionBalance.protein.status === '不足') {
        tips.push('蛋白质摄入不足，建议增加肉类、蛋类、豆类等食物');
      }
      if (nutritionBalance.fat.status === '过量') {
        tips.push('脂肪摄入过量，建议减少高脂肪食物的摄入');
      }
      if (nutritionBalance.carbs.status === '不足') {
        tips.push('碳水化合物摄入不足，建议增加主食的摄入');
      }
      if (nutritionBalance.calories.status === '过量') {
        tips.push('卡路里摄入过量，建议控制饮食量或增加运动');
      } else if (nutritionBalance.calories.status === '不足') {
        tips.push('卡路里摄入不足，建议增加营养丰富的食物');
      }
    }

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
