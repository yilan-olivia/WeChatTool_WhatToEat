/**
 * 推荐算法工具模块
 * 包含匹配度计算、相似度计算等推荐算法
 */

/**
 * 计算食材匹配度
 * @param {Array<string>} userFoods 用户拥有的食材列表
 * @param {Array<string>} recipeIngredients 食谱所需食材列表
 * @returns {Object} 返回 {score: 0-100, matched: Array, missing: Array, matchRatio: Number}
 */
function calculateMatchScore(userFoods, recipeIngredients) {
  if (!userFoods || userFoods.length === 0) {
    return {
      score: 0,
      matched: [],
      missing: recipeIngredients || [],
      matchRatio: 0,
    };
  }

  if (!recipeIngredients || recipeIngredients.length === 0) {
    return {
      score: 100,
      matched: [],
      missing: [],
      matchRatio: 1,
    };
  }

  // 标准化食材名称（去除用量、单位等）
  const normalizeFood = (food) => {
    return food
      .replace(/\d+[g|克|ml|毫升|个|根|片|块|条|只|斤|两|kg|千克]+/g, '')
      .replace(/[，,。、]/g, '')
      .trim();
  };

  const normalizedUserFoods = userFoods.map(normalizeFood);
  const normalizedRecipeIngredients = recipeIngredients.map(normalizeFood);

  // 计算匹配的食材
  const matched = [];
  const missing = [];

  for (const ingredient of normalizedRecipeIngredients) {
    // 检查是否匹配（支持部分匹配）
    const matchedFood = normalizedUserFoods.find(userFood => {
      return userFood.includes(ingredient) || ingredient.includes(userFood);
    });

    if (matchedFood) {
      matched.push(ingredient);
    } else {
      missing.push(ingredient);
    }
  }

  // 计算匹配度
  const matchRatio = matched.length / normalizedRecipeIngredients.length;
  
  // 匹配度评分（完全匹配100分，部分匹配按比例）
  let score = matchRatio * 100;

  // 如果缺少关键食材（如主料），适当降分
  const keyIngredients = ['肉', '鱼', '鸡', '蛋', '豆腐', '米饭', '面'];
  const missingKeyIngredients = missing.filter(ing => 
    keyIngredients.some(key => ing.includes(key))
  );
  
  if (missingKeyIngredients.length > 0) {
    score = score * 0.7; // 缺少关键食材降30%
  }

  return {
    score: Math.round(score),
    matched,
    missing,
    matchRatio,
  };
}

/**
 * 计算偏好匹配度
 * @param {Array<string>} userPreferences 用户偏好列表
 * @param {Object} recipeTags 食谱标签对象
 * @returns {number} 返回0-100的匹配度分数
 */
function calculatePreferenceScore(userPreferences, recipeTags) {
  if (!userPreferences || userPreferences.length === 0) {
    return 50; // 无偏好时给中等分数
  }

  if (!recipeTags || Object.keys(recipeTags).length === 0) {
    return 50;
  }

  // 偏好权重映射
  const preferenceWeights = {
    '低脂': { tag: 'lowFat', weight: 1.5 },
    '快手': { tag: 'quick', weight: 1.2 },
    '高蛋白': { tag: 'highProtein', weight: 1.3 },
    '素食': { tag: 'vegetarian', weight: 1.5 },
    '无麸质': { tag: 'glutenFree', weight: 1.2 },
    '低糖': { tag: 'lowSugar', weight: 1.2 },
    '高纤维': { tag: 'highFiber', weight: 1.1 },
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const preference of userPreferences) {
    const prefConfig = preferenceWeights[preference];
    if (!prefConfig) continue;

    const hasTag = recipeTags[prefConfig.tag] === true;
    if (hasTag) {
      totalScore += 100 * prefConfig.weight;
    } else {
      totalScore += 30 * prefConfig.weight; // 不匹配时给较低分数
    }
    totalWeight += prefConfig.weight;
  }

  if (totalWeight === 0) {
    return 50;
  }

  return Math.round(totalScore / totalWeight);
}

/**
 * 计算余弦相似度
 * @param {Array<number>} vectorA 向量A
 * @param {Array<number>} vectorB 向量B
 * @returns {number} 相似度（0-1）
 */
function cosineSimilarity(vectorA, vectorB) {
  if (vectorA.length !== vectorB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 计算用户相似度（基于用户画像向量）
 * @param {Object} userA 用户A的画像
 * @param {Object} userB 用户B的画像
 * @returns {number} 相似度（0-1）
 */
function calculateUserSimilarity(userA, userB) {
  // 构建特征向量
  const features = [
    'preferences', // 偏好
    'dietaryRestrictions', // 饮食限制
    'averageCalories', // 平均热量
    'foodCategories', // 食物分类偏好
    'cookingDifficulty', // 烹饪难度偏好
  ];

  const vectorA = [];
  const vectorB = [];

  for (const feature of features) {
    const valueA = userA[feature] || 0;
    const valueB = userB[feature] || 0;

    // 处理数组类型特征
    if (Array.isArray(valueA) && Array.isArray(valueB)) {
      const intersection = valueA.filter(x => valueB.includes(x)).length;
      const union = new Set([...valueA, ...valueB]).size;
      vectorA.push(union > 0 ? intersection / union : 0);
      vectorB.push(1);
    } else {
      // 归一化数值特征
      const normalizedA = typeof valueA === 'number' ? valueA / 3000 : 0;
      const normalizedB = typeof valueB === 'number' ? valueB / 3000 : 0;
      vectorA.push(normalizedA);
      vectorB.push(normalizedB);
    }
  }

  return cosineSimilarity(vectorA, vectorB);
}

/**
 * 计算热度分数
 * @param {Object} stats 统计数据
 * @param {Object} options 选项
 * @returns {number} 热度分数
 */
function calculatePopularityScore(stats, options = {}) {
  const {
    likeCount = 0,
    collectCount = 0,
    commentCount = 0,
    viewCount = 0,
    createTime = new Date(),
  } = stats;

  const {
    likeWeight = 2,
    collectWeight = 3,
    commentWeight = 1.5,
    viewWeight = 0.5,
    timeDecay = true,
    decayFactor = 0.95, // 每天衰减5%
  } = options;

  // 基础分数
  let score = 
    likeCount * likeWeight +
    collectCount * collectWeight +
    commentCount * commentWeight +
    viewCount * viewWeight;

  // 时间衰减
  if (timeDecay) {
    const daysSinceCreation = (Date.now() - new Date(createTime).getTime()) / (1000 * 60 * 60 * 24);
    const decay = Math.pow(decayFactor, daysSinceCreation);
    score = score * decay;
  }

  return Math.round(score);
}

/**
 * 计算综合推荐分数
 * @param {Object} scores 各项分数
 * @param {Object} weights 权重配置
 * @returns {number} 综合分数
 */
function calculateTotalScore(scores, weights = {}) {
  const {
    matchScore = 0,
    preferenceScore = 0,
    nutritionScore = 0,
    popularityScore = 0,
    difficultyScore = 0,
  } = scores;

  const {
    matchWeight = 0.3,
    preferenceWeight = 0.25,
    nutritionWeight = 0.2,
    popularityWeight = 0.15,
    difficultyWeight = 0.1,
  } = weights;

  const totalScore = 
    matchScore * matchWeight +
    preferenceScore * preferenceWeight +
    nutritionScore * nutritionWeight +
    popularityScore * popularityWeight +
    difficultyScore * difficultyWeight;

  return Math.round(totalScore);
}

module.exports = {
  calculateMatchScore,
  calculatePreferenceScore,
  cosineSimilarity,
  calculateUserSimilarity,
  calculatePopularityScore,
  calculateTotalScore,
};
