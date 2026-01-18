/**
 * 智能食谱生成云函数
 * 根据用户库存菜品、偏好设置生成智能推荐食谱
 * 包含食材匹配、偏好权重、营养评分等算法
 */

const cloud = require('wx-server-sdk');
const { checkRateLimit } = require('../common/rateLimit');
const { validate } = require('../common/validator');
const { info, error, logExecutionTime } = require('../common/logger');
const { generateRecipe } = require('../common/aiClient');
const { 
  calculateMatchScore, 
  calculatePreferenceScore, 
  calculateTotalScore 
} = require('../common/recommendation');
const { 
  calculateRecipeNutrition, 
  calculateNutritionScore 
} = require('../common/nutrition');
const config = require('./config');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 获取用户库存菜品
 * @param {string} userId 用户ID
 * @returns {Promise<Array>}
 */
async function getUserFoods(userId) {
  try {
    const result = await db.collection('food_items')
      .where({
        userId,
        isDeleted: false,
        status: db.command.neq('expired'),
      })
      .get();

    return result.data.map(food => food.name);
  } catch (err) {
    error('recipe-generate', '获取用户菜品失败', err, userId);
    return [];
  }
}

/**
 * 获取用户偏好设置
 * @param {string} userId 用户ID
 * @returns {Promise<Object>}
 */
async function getUserPreferences(userId) {
  try {
    const result = await db.collection('users')
      .doc(userId)
      .get();

    const user = result.data;
    return {
      preferences: user.preferences || [],
      dietaryRestrictions: user.dietaryRestrictions || [],
      targetCalories: user.targetCalories || 2000,
      cookingDifficulty: user.cookingDifficulty || '简单',
    };
  } catch (err) {
    error('recipe-generate', '获取用户偏好失败', err, userId);
    return {
      preferences: [],
      dietaryRestrictions: [],
      targetCalories: 2000,
      cookingDifficulty: '简单',
    };
  }
}

/**
 * 获取推荐食谱列表（从数据库）
 * @param {Object} options 选项
 * @returns {Promise<Array>}
 */
async function getRecommendedRecipes(options = {}) {
  const {
    limit = 50,
    category = null,
    tags = null,
  } = options;

  try {
    let query = db.collection('recipes')
      .where({
        isDeleted: false,
        isPublic: true,
      });

    if (category) {
      query = query.where({ category });
    }

    const result = await query
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();

    let recipes = result.data;

    // 标签过滤
    if (tags && tags.length > 0) {
      recipes = recipes.filter(recipe => {
        const recipeTags = recipe.tags || {};
        return tags.some(tag => recipeTags[tag] === true);
      });
    }

    return recipes;
  } catch (err) {
    error('recipe-generate', '获取推荐食谱失败', err);
    return [];
  }
}

/**
 * 计算食谱难度评分
 * @param {string} difficulty 难度
 * @param {string} userDifficulty 用户偏好难度
 * @returns {number} 0-100分
 */
function calculateDifficultyScore(difficulty, userDifficulty) {
  const difficultyMap = {
    '简单': 1,
    '中等': 2,
    '困难': 3,
  };

  const recipeLevel = difficultyMap[difficulty] || 2;
  const userLevel = difficultyMap[userDifficulty] || 1;

  // 用户偏好难度得分最高
  if (recipeLevel === userLevel) {
    return 100;
  }

  // 难度差异越大，分数越低
  const diff = Math.abs(recipeLevel - userLevel);
  return Math.max(0, 100 - diff * 30);
}

/**
 * 推荐食谱（基于匹配算法）
 * @param {Array<string>} userFoods 用户库存菜品
 * @param {Object} userPrefs 用户偏好
 * @param {number} limit 推荐数量
 * @returns {Promise<Array>}
 */
async function recommendRecipes(userFoods, userPrefs, limit = 10) {
  // 获取候选食谱
  const candidateRecipes = await getRecommendedRecipes({
    limit: 100,
    tags: userPrefs.preferences,
  });

  if (candidateRecipes.length === 0) {
    return [];
  }

  // 计算每个食谱的推荐分数
  const scoredRecipes = [];

  for (const recipe of candidateRecipes) {
    // 食材匹配度
    const matchResult = calculateMatchScore(
      userFoods,
      recipe.ingredients || []
    );

    // 偏好匹配度
    const preferenceScore = calculatePreferenceScore(
      userPrefs.preferences,
      recipe.tags || {}
    );

    // 营养评分
    const nutrition = calculateRecipeNutrition(recipe.ingredients || []);
    const nutritionScoreResult = calculateNutritionScore(nutrition, {
      calories: userPrefs.targetCalories,
    });

    // 难度评分
    const difficultyScore = calculateDifficultyScore(
      recipe.difficulty || '简单',
      userPrefs.cookingDifficulty
    );

    // 综合评分
    const totalScore = calculateTotalScore({
      matchScore: matchResult.score,
      preferenceScore,
      nutritionScore: nutritionScoreResult.totalScore,
      difficultyScore,
    }, {
      matchWeight: 0.35,
      preferenceWeight: 0.25,
      nutritionWeight: 0.2,
      difficultyWeight: 0.2,
    });

    scoredRecipes.push({
      ...recipe,
      scores: {
        match: matchResult.score,
        preference: preferenceScore,
        nutrition: nutritionScoreResult.totalScore,
        difficulty: difficultyScore,
        total: totalScore,
      },
      matchInfo: {
        matched: matchResult.matched,
        missing: matchResult.missing,
        matchRatio: matchResult.matchRatio,
      },
      nutrition,
    });
  }

  // 按总分排序
  scoredRecipes.sort((a, b) => b.scores.total - a.scores.total);

  // 返回前N个
  return scoredRecipes.slice(0, limit);
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  const { 
    foods, // 用户选择的食材（可选，不提供则使用库存）
    preference, // 口味偏好（可选）
    mode = 'generate', // 'generate' 生成新食谱, 'recommend' 推荐现有食谱
    limit = 10, // 推荐数量
  } = event;

  return await logExecutionTime('recipe-generate', async () => {
    try {
      // 频率限制检查
      const rateLimit = await checkRateLimit('recipe-generate', userId);
      if (!rateLimit.allowed) {
        return {
          errCode: -2,
          errMsg: rateLimit.message,
          data: {
            resetTime: rateLimit.resetTime,
          },
        };
      }

      // 获取用户偏好
      const userPrefs = await getUserPreferences(userId);

      // 获取用户库存菜品
      let userFoods = foods;
      if (!userFoods || userFoods.length === 0) {
        userFoods = await getUserFoods(userId);
      }

      if (userFoods.length === 0) {
        return {
          errCode: -1,
          errMsg: '请先添加菜品到库存',
          data: null,
        };
      }

      info('recipe-generate', '开始处理', { 
        userId, 
        mode, 
        foodsCount: userFoods.length,
        preferences: userPrefs.preferences,
      }, userId);

      if (mode === 'recommend') {
        // 推荐模式：从现有食谱中推荐
        const recommendedRecipes = await recommendRecipes(
          userFoods,
          userPrefs,
          limit
        );

        return {
          errCode: 0,
          errMsg: 'success',
          data: {
            recipes: recommendedRecipes,
            count: recommendedRecipes.length,
          },
        };
      } else {
        // 生成模式：使用AI生成新食谱
        const finalPreference = preference || userPrefs.preferences[0] || '无要求';

        // 调用AI生成食谱
        let recipe;
        try {
          recipe = await generateRecipe(
            userFoods,
            finalPreference,
            config.aiApi
          );
        } catch (apiErr) {
          error('recipe-generate', 'AI生成失败，使用降级方案', apiErr, userId);
          // 降级到模拟数据
          recipe = {
            name: `${userFoods.slice(0, 3).join('、')} 炒菜`,
            difficulty: userPrefs.cookingDifficulty,
            time: '30分钟',
            calories: 350,
            ingredients: userFoods.map(food => `${food} 适量`),
            steps: [
              `将${userFoods[0]}清洗干净，切好备用`,
              '热锅下油，放入调料爆香',
              `依次加入${userFoods.slice(0, 3).join('、')}，翻炒均匀`,
              '加入适量调味料，炒至熟透即可',
            ],
          };
        }

        // 计算营养成分
        const nutrition = calculateRecipeNutrition(recipe.ingredients || []);
        recipe.nutrition = nutrition;

        // 计算营养评分
        const nutritionScore = calculateNutritionScore(nutrition, {
          calories: userPrefs.targetCalories,
        });
        recipe.nutritionScore = nutritionScore;

        // 计算匹配度
        const matchResult = calculateMatchScore(userFoods, recipe.ingredients || []);
        recipe.matchInfo = matchResult;

        // 计算偏好匹配度
        const preferenceScore = calculatePreferenceScore(
          userPrefs.preferences,
          recipe.tags || {}
        );
        recipe.preferenceScore = preferenceScore;

        info('recipe-generate', '食谱生成成功', { name: recipe.name }, userId);

        return {
          errCode: 0,
          errMsg: 'success',
          data: recipe,
        };
      }
    } catch (err) {
      error('recipe-generate', '处理失败', err, userId);
      return {
        errCode: -1,
        errMsg: err.message || '处理失败',
        data: null,
      };
    }
  }, { userId });
};
