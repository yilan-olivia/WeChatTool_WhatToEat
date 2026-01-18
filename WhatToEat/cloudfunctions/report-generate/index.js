/**
 * 健康报告生成云函数
 * 生成用户健康报告，包含热量分析、营养分析、多样性评估等
 */

const cloud = require('wx-server-sdk');
const { validate } = require('../common/validator');
const { info, error, logExecutionTime } = require('../common/logger');
const { analyzeNutritionIntake, calculateNutritionScore } = require('../common/nutrition');
const config = require('./config');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

/**
 * 计算分类统计
 * @param {Array} foods 菜品列表
 * @returns {Array}
 */
function calculateCategoryStats(foods) {
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
    percentage: total > 0 ? Math.round((categoryMap[category] / total) * 100 * 10) / 10 : 0,
  }));
}

/**
 * 分析热量摄入
 * @param {Array} recipes 食谱列表
 * @param {number} days 天数
 * @param {number} targetCalories 目标热量
 * @returns {Object}
 */
function analyzeCalorieIntake(recipes, days, targetCalories = 2000) {
  if (recipes.length === 0) {
    return {
      dailyAverage: 0,
      total: 0,
      target: targetCalories,
      status: '不足',
      trend: 'stable',
    };
  }

  const totalCalories = recipes.reduce((sum, recipe) => {
    return sum + (parseFloat(recipe.calories) || 0);
  }, 0);

  const dailyAverage = Math.round(totalCalories / days);
  const total = totalCalories;

  // 判断状态
  let status = '正常';
  if (dailyAverage < targetCalories * 0.8) {
    status = '不足';
  } else if (dailyAverage > targetCalories * 1.2) {
    status = '过量';
  }

  // 计算趋势（简化版，实际应该对比历史数据）
  const trend = 'stable';

  // 热量来源分析
  const sources = {
    main: 0, // 主食
    protein: 0, // 蛋白质
    fat: 0, // 脂肪
    other: 0, // 其他
  };

  // 简化分析，根据食谱名称和分类判断
  recipes.forEach(recipe => {
    const calories = parseFloat(recipe.calories) || 0;
    if (recipe.category === '主食' || recipe.name.includes('饭') || recipe.name.includes('面')) {
      sources.main += calories;
    } else if (recipe.category === '肉类' || recipe.name.includes('肉') || recipe.name.includes('鱼')) {
      sources.protein += calories;
    } else {
      sources.other += calories;
    }
  });

  return {
    dailyAverage,
    total,
    target: targetCalories,
    status,
    trend,
    sources,
  };
}

/**
 * 分析营养素比例
 * @param {Array} recipes 食谱列表
 * @returns {Object}
 */
function analyzeNutrientRatio(recipes) {
  if (recipes.length === 0) {
    return {
      protein: 0,
      fat: 0,
      carbs: 0,
      ratios: {
        protein: 0,
        fat: 0,
        carbs: 0,
      },
      score: 0,
    };
  }

  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;

  recipes.forEach(recipe => {
    if (recipe.nutrition) {
      totalProtein += recipe.nutrition.protein || 0;
      totalFat += recipe.nutrition.fat || 0;
      totalCarbs += recipe.nutrition.carbs || 0;
    }
  });

  const total = totalProtein + totalFat + totalCarbs;
  const ratios = {
    protein: total > 0 ? Math.round((totalProtein / total) * 100 * 10) / 10 : 0,
    fat: total > 0 ? Math.round((totalFat / total) * 100 * 10) / 10 : 0,
    carbs: total > 0 ? Math.round((totalCarbs / total) * 100 * 10) / 10 : 0,
  };

  // 理想比例评分
  const idealProtein = 17.5;
  const idealFat = 25;
  const idealCarbs = 57.5;

  const ratioScore = 
    (100 - Math.abs(ratios.protein - idealProtein) * 2) * 0.3 +
    (100 - Math.abs(ratios.fat - idealFat) * 2) * 0.3 +
    (100 - Math.abs(ratios.carbs - idealCarbs) * 2) * 0.4;

  return {
    protein: Math.round(totalProtein * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    ratios,
    score: Math.round(ratioScore),
  };
}

/**
 * 评估食物多样性
 * @param {Array} foods 菜品列表
 * @param {Array} recipes 食谱列表
 * @returns {Object}
 */
function evaluateFoodDiversity(foods, recipes) {
  // 统计食物种类
  const foodTypes = new Set();
  const categories = new Set();
  const ingredients = new Set();

  foods.forEach(food => {
    foodTypes.add(food.name);
    categories.add(food.category || '其他');
  });

  recipes.forEach(recipe => {
    (recipe.ingredients || []).forEach(ing => {
      // 提取食材名称（去除用量）
      const name = ing.replace(/\d+[g|克|ml|毫升|个|根|片|块|条|只|斤|两|kg|千克]+/g, '').trim();
      ingredients.add(name);
    });
  });

  // 多样性评分（0-100）
  const typeScore = Math.min(100, foodTypes.size * 10);
  const categoryScore = Math.min(100, categories.size * 20);
  const ingredientScore = Math.min(100, ingredients.size * 5);

  const diversityScore = Math.round((typeScore + categoryScore + ingredientScore) / 3);

  // 推荐增加的食物类型
  const allCategories = ['蔬菜', '水果', '肉类', '海鲜', '调料', '其他'];
  const missingCategories = allCategories.filter(cat => !categories.has(cat));

  return {
    score: diversityScore,
    foodTypesCount: foodTypes.size,
    categoriesCount: categories.size,
    ingredientsCount: ingredients.size,
    missingCategories,
    recommendation: missingCategories.length > 0 
      ? `建议增加${missingCategories.join('、')}类食物，提高饮食多样性`
      : '食物种类丰富，继续保持',
  };
}

/**
 * 评估饮食习惯
 * @param {Array} foods 菜品列表
 * @param {Array} recipes 食谱列表
 * @returns {Object}
 */
function evaluateEatingHabits(foods, recipes) {
  // 用餐时间分析（简化版，实际应该从时间戳分析）
  const mealTimes = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0,
  };

  // 食物偏好分析
  const preferences = {
    vegetable: 0,
    meat: 0,
    fruit: 0,
    seafood: 0,
  };

  foods.forEach(food => {
    const category = food.category || '其他';
    if (category === '蔬菜') preferences.vegetable++;
    else if (category === '肉类') preferences.meat++;
    else if (category === '水果') preferences.fruit++;
    else if (category === '海鲜') preferences.seafood++;
  });

  // 健康习惯评分
  const vegetableRatio = preferences.vegetable / foods.length;
  const healthScore = Math.round(
    (vegetableRatio > 0.3 ? 30 : vegetableRatio * 100) +
    (preferences.fruit > 0 ? 20 : 0) +
    (recipes.length > 0 ? 30 : 0) +
    (foods.length > 10 ? 20 : foods.length * 2)
  );

  return {
    mealTimes,
    preferences,
    healthScore: Math.min(100, healthScore),
    suggestions: generateHabitSuggestions(preferences, foods.length, recipes.length),
  };
}

/**
 * 生成习惯建议
 * @param {Object} preferences 偏好统计
 * @param {number} foodCount 菜品数量
 * @param {number} recipeCount 食谱数量
 * @returns {Array<string>}
 */
function generateHabitSuggestions(preferences, foodCount, recipeCount) {
  const suggestions = [];

  const total = preferences.vegetable + preferences.meat + preferences.fruit + preferences.seafood;
  const vegetableRatio = total > 0 ? preferences.vegetable / total : 0;

  if (vegetableRatio < 0.3) {
    suggestions.push('建议增加蔬菜摄入，保持营养均衡');
  }

  if (preferences.fruit === 0) {
    suggestions.push('建议增加水果摄入，补充维生素');
  }

  if (recipeCount === 0) {
    suggestions.push('建议多尝试新食谱，丰富饮食体验');
  }

  if (foodCount < 5) {
    suggestions.push('建议增加菜品种类，提高饮食多样性');
  }

  if (suggestions.length === 0) {
    suggestions.push('您的饮食习惯很好，继续保持！');
  }

  return suggestions;
}

/**
 * 生成健康建议
 * @param {Object} analysis 分析结果
 * @returns {Array<string>}
 */
function generateHealthTips(analysis) {
  const tips = [];

  // 热量建议
  if (analysis.calorieIntake.status === '不足') {
    tips.push('热量摄入不足，建议增加食物摄入量');
  } else if (analysis.calorieIntake.status === '过量') {
    tips.push('热量摄入偏高，建议适当控制饮食');
  }

  // 营养建议
  if (analysis.nutrientRatio.score < 60) {
    tips.push('营养素比例不够均衡，建议调整饮食结构');
  }

  // 多样性建议
  if (analysis.diversity.score < 60) {
    tips.push(analysis.diversity.recommendation);
  }

  // 习惯建议
  if (analysis.habits.healthScore < 70) {
    tips.push(...analysis.habits.suggestions);
  }

  // 浪费建议
  if (analysis.wasteCount > 0) {
    tips.push(`本周有${analysis.wasteCount}个菜品过期，建议合理规划采购和食用计划`);
  }

  if (tips.length === 0) {
    tips.push('您的饮食管理很棒，继续保持！');
  }

  return tips;
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  const { startDate, endDate } = event;

  return await logExecutionTime('report-generate', async () => {
    try {
      // 参数验证
      const validation = validate(event, {
        startDate: {
          type: 'string',
          required: true,
        },
        endDate: {
          type: 'string',
          required: true,
        },
      });

      if (!validation.isValid) {
        return {
          errCode: -1,
          errMsg: validation.errors[0].message,
          data: null,
        };
      }

      // 验证日期范围
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return {
          errCode: -1,
          errMsg: '日期格式不正确',
          data: null,
        };
      }

      if (start > end) {
        return {
          errCode: -1,
          errMsg: '开始日期不能晚于结束日期',
          data: null,
        };
      }

      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (daysDiff > config.report.maxDays) {
        return {
          errCode: -1,
          errMsg: `时间范围不能超过${config.report.maxDays}天`,
          data: null,
        };
      }

      info('report-generate', '开始生成报告', { userId, startDate, endDate }, userId);

      // 设置结束时间为当天的最后一刻
      end.setHours(23, 59, 59, 999);

      // 获取用户目标热量
      let targetCalories = 2000;
      try {
        const userResult = await db.collection('users').doc(userId).get();
        if (userResult.data) {
          targetCalories = userResult.data.targetCalories || 2000;
        }
      } catch (err) {
        // 使用默认值
      }

      // 查询数据
      const [foods, recipes, expiredFoods] = await Promise.all([
        // 查询菜品
        db.collection('food_items')
          .where({
            userId: userId,
            createTime: _.gte(start).and(_.lte(end)),
            isDeleted: false,
          })
          .get(),
        // 查询食谱
        db.collection('recipes')
          .where({
            userId: userId,
            createTime: _.gte(start).and(_.lte(end)),
            isDeleted: false,
          })
          .get(),
        // 查询过期菜品
        db.collection('food_items')
          .where({
            userId: userId,
            status: 'expired',
            updateTime: _.gte(start).and(_.lte(end)),
            isDeleted: false,
          })
          .get(),
      ]);

      const foodsData = foods.data;
      const recipesData = recipes.data;
      const expiredFoodsData = expiredFoods.data;

      // 计算统计数据
      const categoryStats = calculateCategoryStats(foodsData);
      const avgCalories = recipesData.length > 0
        ? Math.round(recipesData.reduce((sum, r) => sum + (parseFloat(r.calories) || 0), 0) / recipesData.length)
        : 0;

      // 深度分析
      const calorieIntake = analyzeCalorieIntake(recipesData, daysDiff, targetCalories);
      const nutrientRatio = analyzeNutrientRatio(recipesData);
      const diversity = evaluateFoodDiversity(foodsData, recipesData);
      const habits = evaluateEatingHabits(foodsData, recipesData);

      // 生成健康建议
      const analysis = {
        calorieIntake,
        nutrientRatio,
        diversity,
        habits,
        wasteCount: expiredFoodsData.length,
      };

      const tips = generateHealthTips(analysis);

      // 构建报告数据
      const report = {
        userId: userId,
        startDate: start,
        endDate: end,
        totalFoods: foodsData.length,
        totalRecipes: recipesData.length,
        avgCalories: avgCalories,
        categoryStats: categoryStats,
        wasteCount: expiredFoodsData.length,
        analysis: analysis,
        tips: tips,
        isDeleted: false,
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
      };

      // 保存报告到数据库
      const result = await db.collection('health_reports').add({
        data: report,
      });

      info('report-generate', '报告生成成功', { reportId: result._id }, userId);

      return {
        errCode: 0,
        errMsg: 'success',
        data: {
          ...report,
          _id: result._id,
        },
      };
    } catch (err) {
      error('report-generate', '报告生成失败', err, userId);
      return {
        errCode: -1,
        errMsg: err.message || '生成失败',
        data: null,
      };
    }
  }, { userId });
};
