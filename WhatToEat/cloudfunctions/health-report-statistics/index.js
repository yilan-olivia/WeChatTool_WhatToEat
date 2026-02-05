/**
 * 健康报告统计云函数
 * 获取健康报告页面的统计数据，包括菜品总数、食谱总数、浪费数量等
 * 所有数据查询都基于用户ID进行权限控制
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

/**
 * 简单的日志函数
 */
function info(functionName, message, data, userId) {
  console.log(`[INFO] [${functionName}] ${message}`, data || '', userId ? `[User: ${userId}]` : '');
}

function error(functionName, message, error, userId) {
  console.error(`[ERROR] [${functionName}] ${message}`, error, userId ? `[User: ${userId}]` : '');
}

/**
 * 执行时间统计
 */
async function logExecutionTime(functionName, fn, context) {
  const start = Date.now();
  try {
    const result = await fn();
    const end = Date.now();
    info(functionName, `执行完成，耗时 ${end - start}ms`, null, context?.userId);
    return result;
  } catch (err) {
    const end = Date.now();
    error(functionName, `执行失败，耗时 ${end - start}ms`, err, context?.userId);
    throw err;
  }
}

/**
 * 格式化日期为 YYYY-MM-DD 字符串
 * @param {Date} date 
 * @returns {string}
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
    percentage: total > 0 ? (categoryMap[category] / total) * 100 : 0,
  }));
}

/**
 * 计算平均热量
 * @param {Array} recipes 食谱列表
 * @returns {number}
 */
function calculateAvgCalories(recipes) {
  if (recipes.length === 0) return 0;
  
  const totalCalories = recipes.reduce((sum, recipe) => {
    const calories = parseFloat(recipe.calories) || 0;
    return sum + calories;
  }, 0);

  return totalCalories / recipes.length;
}

/**
 * 计算每日卡路里
 * @param {Array} recipes 食谱列表
 * @param {Date} startDate 开始日期
 * @param {Date} endDate 结束日期
 * @returns {Array}
 */
function calculateDailyCalories(recipes, startDate, endDate) {
  const dailyMap = {};
  
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  while (currentDate <= end) {
    const dateKey = formatDate(currentDate);
    dailyMap[dateKey] = 0;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  recipes.forEach(recipe => {
    if (recipe.createTime) {
      const recipeDate = new Date(recipe.createTime);
      const dateKey = formatDate(recipeDate);
      const calories = parseFloat(recipe.calories) || 0;
      if (dailyMap.hasOwnProperty(dateKey)) {
        dailyMap[dateKey] += calories;
      }
    }
  });

  return Object.keys(dailyMap)
    .sort()
    .map(date => ({
      date: date,
      calories: Math.round(dailyMap[date]),
    }));
}

/**
 * 计算每周卡路里
 * @param {Array} recipes 食谱列表
 * @returns {number}
 */
function calculateWeeklyCalories(recipes) {
  const totalCalories = recipes.reduce((sum, recipe) => {
    const calories = parseFloat(recipe.calories) || 0;
    return sum + calories;
  }, 0);

  return Math.round(totalCalories);
}

/**
 * 计算营养均衡情况
 * @param {Array} recipes 食谱列表
 * @param {number} days 天数
 * @returns {Object}
 */
function calculateNutritionBalance(recipes, days = 7) {
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

  const totalNutrition = recipes.reduce((sum, recipe) => {
    return {
      calories: sum.calories + (parseFloat(recipe.calories) || 0),
      protein: sum.protein + (parseFloat(recipe.protein) || 0),
      fat: sum.fat + (parseFloat(recipe.fat) || 0),
      carbs: sum.carbs + (parseFloat(recipe.carbs) || 0),
    };
  }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

  const avgNutrition = {
    calories: Math.round(totalNutrition.calories / days),
    protein: Math.round((totalNutrition.protein / days) * 10) / 10,
    fat: Math.round((totalNutrition.fat / days) * 10) / 10,
    carbs: Math.round((totalNutrition.carbs / days) * 10) / 10,
  };

  const targets = {
    calories: 2000,
    protein: 60,
    fat: 65,
    carbs: 300,
  };

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
}

/**
 * 生成健康建议
 * @param {Array} foods 菜品列表
 * @param {Array} recipes 食谱列表
 * @param {Array} categoryStats 分类统计
 * @param {Object} nutritionBalance 营养均衡
 * @returns {Array<string>}
 */
function generateHealthTips(foods, recipes, categoryStats, nutritionBalance) {
  const tips = [];

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

  if (categoryStats.length < 3) {
    tips.push('建议增加菜品多样性，保证营养均衡');
  }

  const expiredCount = foods.filter(f => f.status === 'expired').length;
  if (expiredCount > 0) {
    tips.push(`本周有${expiredCount}个菜品过期，建议合理规划采购和食用计划`);
  }

  if (recipes.length === 0) {
    tips.push('建议多使用食谱生成功能，尝试新的菜品搭配');
  }

  const vegetableCount = categoryStats.find(s => s.category === '蔬菜')?.count || 0;
  if (vegetableCount < foods.length * 0.3) {
    tips.push('建议增加蔬菜类菜品的摄入，保持健康饮食');
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

  return await logExecutionTime('health-report-statistics', async () => {
    try {
      if (!startDate || !endDate) {
        return {
          errCode: -1,
          errMsg: '请提供开始日期和结束日期',
          data: null,
        };
      }

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

      end.setHours(23, 59, 59, 999);

      info('health-report-statistics', '开始查询统计数据', { userId, startDate, endDate }, userId);

      const [foods, recipes, expiredFoods] = await Promise.all([
        db.collection('food_items')
          .where({
            userId: userId,
            createTime: _.gte(start).and(_.lte(end)),
            isDeleted: false,
          })
          .get(),
        db.collection('recipes')
          .where({
            userId: userId,
            createTime: _.gte(start).and(_.lte(end)),
            isDeleted: false,
          })
          .get(),
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

      const categoryStats = calculateCategoryStats(foodsData);
      const avgCalories = calculateAvgCalories(recipesData);
      const dailyCalories = calculateDailyCalories(recipesData, start, end);
      const weeklyCalories = calculateWeeklyCalories(recipesData);
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const nutritionBalance = calculateNutritionBalance(recipesData, daysDiff);
      const tips = generateHealthTips(foodsData, recipesData, categoryStats, nutritionBalance);

      const categoryNutritionData = categoryStats.map(item => ({
        name: item.category,
        type: item.category,
        value: item.count,
        unit: '个',
        percentage: item.percentage,
      }));

      const reportData = {
        totalFoods: foodsData.length,
        totalRecipes: recipesData.length,
        avgCalories: avgCalories.toFixed(0),
        wasteCount: expiredFoodsData.length,
        categoryStats,
        tips,
      };

      info('health-report-statistics', '统计数据查询成功', { 
        totalFoods: reportData.totalFoods,
        totalRecipes: reportData.totalRecipes,
        wasteCount: reportData.wasteCount 
      }, userId);

      return {
        errCode: 0,
        errMsg: 'success',
        data: {
          reportData,
          categoryNutritionData,
          dailyCalories,
          weeklyCalories,
          nutritionBalance,
        },
      };
    } catch (err) {
      error('health-report-statistics', '查询统计数据失败', err, userId);
      return {
        errCode: -1,
        errMsg: err.message || '查询失败',
        data: null,
      };
    }
  }, { userId });
};
