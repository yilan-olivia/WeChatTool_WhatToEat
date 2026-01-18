/**
 * 营养计算工具模块
 * 包含营养成分计算、营养评分等功能
 */

/**
 * 营养成分数据库（简化版，实际应该从数据库或API获取）
 */
const NUTRITION_DB = {
  // 常见食材营养成分（每100g）
  西红柿: { calories: 18, protein: 0.9, fat: 0.2, carbs: 3.5, fiber: 1.2 },
  苹果: { calories: 52, protein: 0.3, fat: 0.2, carbs: 13.8, fiber: 2.4 },
  鸡蛋: { calories: 155, protein: 13, fat: 11, carbs: 1.1, fiber: 0 },
  土豆: { calories: 77, protein: 2, fat: 0.1, carbs: 17, fiber: 2.2 },
  胡萝卜: { calories: 41, protein: 0.9, fat: 0.2, carbs: 9.6, fiber: 2.8 },
  米饭: { calories: 130, protein: 2.6, fat: 0.3, carbs: 28, fiber: 0.3 },
  面条: { calories: 138, protein: 4.2, fat: 0.7, carbs: 28, fiber: 1.2 },
  鸡肉: { calories: 165, protein: 31, fat: 3.6, carbs: 0, fiber: 0 },
  猪肉: { calories: 242, protein: 27, fat: 14, carbs: 0, fiber: 0 },
  牛肉: { calories: 250, protein: 26, fat: 15, carbs: 0, fiber: 0 },
  鱼: { calories: 206, protein: 22, fat: 12, carbs: 0, fiber: 0 },
  豆腐: { calories: 81, protein: 8.1, fat: 3.7, carbs: 4.2, fiber: 0.4 },
  青菜: { calories: 15, protein: 1.5, fat: 0.2, carbs: 2.4, fiber: 1.1 },
};

/**
 * 获取食材营养成分
 * @param {string} foodName 食材名称
 * @param {number} amount 数量（克）
 * @returns {Object} 营养成分
 */
function getFoodNutrition(foodName, amount = 100) {
  const nutrition = NUTRITION_DB[foodName];
  if (!nutrition) {
    // 默认值
    return {
      calories: 50 * (amount / 100),
      protein: 2 * (amount / 100),
      fat: 1 * (amount / 100),
      carbs: 10 * (amount / 100),
      fiber: 1 * (amount / 100),
    };
  }

  const ratio = amount / 100;
  return {
    calories: Math.round(nutrition.calories * ratio),
    protein: Math.round(nutrition.protein * ratio * 10) / 10,
    fat: Math.round(nutrition.fat * ratio * 10) / 10,
    carbs: Math.round(nutrition.carbs * ratio * 10) / 10,
    fiber: Math.round(nutrition.fiber * ratio * 10) / 10,
  };
}

/**
 * 计算食谱总营养成分
 * @param {Array<Object>} ingredients 食材列表，格式：[{name: '食材名', amount: 100}]
 * @returns {Object} 总营养成分
 */
function calculateRecipeNutrition(ingredients) {
  if (!ingredients || ingredients.length === 0) {
    return {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0,
    };
  }

  const total = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
  };

  for (const ingredient of ingredients) {
    const name = ingredient.name || ingredient;
    const amount = ingredient.amount || 100;
    
    // 从食材名称中提取数量（如果有）
    const amountMatch = name.match(/(\d+)[g|克|ml|毫升|个|根|片|块|条|只|斤|两|kg|千克]/);
    const extractedAmount = amountMatch ? parseInt(amountMatch[1]) : amount;
    
    // 提取食材名称（去除用量）
    const foodName = name.replace(/\d+[g|克|ml|毫升|个|根|片|块|条|只|斤|两|kg|千克]+/g, '').trim();
    
    const nutrition = getFoodNutrition(foodName, extractedAmount);
    
    total.calories += nutrition.calories;
    total.protein += nutrition.protein;
    total.fat += nutrition.fat;
    total.carbs += nutrition.carbs;
    total.fiber += nutrition.fiber;
  }

  return {
    calories: Math.round(total.calories),
    protein: Math.round(total.protein * 10) / 10,
    fat: Math.round(total.fat * 10) / 10,
    carbs: Math.round(total.carbs * 10) / 10,
    fiber: Math.round(total.fiber * 10) / 10,
  };
}

/**
 * 计算营养均衡评分
 * @param {Object} nutrition 营养成分
 * @param {Object} target 目标值（可选）
 * @returns {Object} 评分结果
 */
function calculateNutritionScore(nutrition, target = {}) {
  const {
    calories: targetCalories = 2000,
    protein: targetProtein = 60, // 每日推荐量（g）
    fat: targetFat = 65, // 每日推荐量（g）
    carbs: targetCarbs = 300, // 每日推荐量（g）
  } = target;

  const { calories, protein, fat, carbs } = nutrition;

  // 计算各项得分（0-100）
  const caloriesScore = Math.max(0, 100 - Math.abs(calories - targetCalories) / targetCalories * 100);
  const proteinScore = Math.min(100, (protein / targetProtein) * 100);
  const fatScore = Math.max(0, 100 - Math.abs(fat - targetFat) / targetFat * 100);
  const carbsScore = Math.max(0, 100 - Math.abs(carbs - targetCarbs) / targetCarbs * 100);

  // 计算三大营养素比例
  const totalMacro = protein + fat + carbs;
  const proteinRatio = totalMacro > 0 ? (protein / totalMacro) * 100 : 0;
  const fatRatio = totalMacro > 0 ? (fat / totalMacro) * 100 : 0;
  const carbsRatio = totalMacro > 0 ? (carbs / totalMacro) * 100 : 0;

  // 理想比例：蛋白质15-20%，脂肪20-30%，碳水50-60%
  const idealProteinRatio = 17.5;
  const idealFatRatio = 25;
  const idealCarbsRatio = 57.5;

  const ratioScore = 
    (100 - Math.abs(proteinRatio - idealProteinRatio) * 2) * 0.3 +
    (100 - Math.abs(fatRatio - idealFatRatio) * 2) * 0.3 +
    (100 - Math.abs(carbsRatio - idealCarbsRatio) * 2) * 0.4;

  // 综合评分
  const totalScore = (
    caloriesScore * 0.3 +
    proteinScore * 0.25 +
    fatScore * 0.15 +
    carbsScore * 0.15 +
    ratioScore * 0.15
  );

  return {
    totalScore: Math.round(totalScore),
    caloriesScore: Math.round(caloriesScore),
    proteinScore: Math.round(proteinScore),
    fatScore: Math.round(fatScore),
    carbsScore: Math.round(carbsScore),
    ratioScore: Math.round(ratioScore),
    ratios: {
      protein: Math.round(proteinRatio * 10) / 10,
      fat: Math.round(fatRatio * 10) / 10,
      carbs: Math.round(carbsRatio * 10) / 10,
    },
  };
}

/**
 * 分析营养摄入
 * @param {Array<Object>} meals 餐食列表
 * @param {Object} target 目标值
 * @returns {Object} 分析结果
 */
function analyzeNutritionIntake(meals, target = {}) {
  const totalNutrition = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
  };

  for (const meal of meals) {
    if (meal.nutrition) {
      totalNutrition.calories += meal.nutrition.calories || 0;
      totalNutrition.protein += meal.nutrition.protein || 0;
      totalNutrition.fat += meal.nutrition.fat || 0;
      totalNutrition.carbs += meal.nutrition.carbs || 0;
      totalNutrition.fiber += meal.nutrition.fiber || 0;
    }
  }

  const score = calculateNutritionScore(totalNutrition, target);

  // 分析各项指标
  const analysis = {
    calories: {
      value: totalNutrition.calories,
      target: target.calories || 2000,
      status: totalNutrition.calories < (target.calories || 2000) * 0.8 ? '不足' :
               totalNutrition.calories > (target.calories || 2000) * 1.2 ? '过量' : '正常',
    },
    protein: {
      value: totalNutrition.protein,
      target: target.protein || 60,
      status: totalNutrition.protein < (target.protein || 60) * 0.8 ? '不足' :
              totalNutrition.protein > (target.protein || 60) * 1.2 ? '过量' : '正常',
    },
    fat: {
      value: totalNutrition.fat,
      target: target.fat || 65,
      status: totalNutrition.fat < (target.fat || 65) * 0.8 ? '不足' :
              totalNutrition.fat > (target.fat || 65) * 1.2 ? '过量' : '正常',
    },
    carbs: {
      value: totalNutrition.carbs,
      target: target.carbs || 300,
      status: totalNutrition.carbs < (target.carbs || 300) * 0.8 ? '不足' :
              totalNutrition.carbs > (target.carbs || 300) * 1.2 ? '过量' : '正常',
    },
  };

  return {
    total: totalNutrition,
    score,
    analysis,
  };
}

module.exports = {
  getFoodNutrition,
  calculateRecipeNutrition,
  calculateNutritionScore,
  analyzeNutritionIntake,
  NUTRITION_DB,
};
