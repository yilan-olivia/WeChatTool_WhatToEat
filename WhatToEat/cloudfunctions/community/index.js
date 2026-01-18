/**
 * 社区互动云函数
 * 处理社区动态的点赞、评论、推荐等操作
 * 包含热门推荐、相似用户推荐、个性化推送、防刷机制
 */

const cloud = require('wx-server-sdk');
const { checkRateLimit } = require('../common/rateLimit');
const { validate } = require('../common/validator');
const { info, error, logExecutionTime } = require('../common/logger');
const { calculatePopularityScore, calculateUserSimilarity } = require('../common/recommendation');
const config = require('./config');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

/**
 * 检测异常行为（防刷）
 * @param {string} userId 用户ID
 * @param {string} action 操作类型
 * @returns {Promise<Object>}
 */
async function detectAbnormalBehavior(userId, action) {
  try {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // 查询最近的操作记录
    const recentActions = await db.collection('user_actions')
      .where({
        userId,
        action,
        createTime: _.gte(new Date(oneMinuteAgo)),
      })
      .count();

    // 频率限制
    const limits = {
      like: 30, // 每分钟最多30次点赞
      publish: 3, // 每分钟最多3次发布
      comment: 10, // 每分钟最多10次评论
    };

    const limit = limits[action] || 10;
    if (recentActions.total >= limit) {
      return {
        isAbnormal: true,
        reason: `操作过于频繁，请稍后再试`,
      };
    }

    // 检查是否有异常模式（如同一时间大量操作）
    const hourActions = await db.collection('user_actions')
      .where({
        userId,
        action,
        createTime: _.gte(new Date(oneHourAgo)),
      })
      .count();

    const hourLimit = limit * 20; // 每小时限制
    if (hourActions.total >= hourLimit) {
      return {
        isAbnormal: true,
        reason: `操作过于频繁，请稍后再试`,
      };
    }

    // 记录操作
    await db.collection('user_actions').add({
      data: {
        userId,
        action,
        createTime: db.serverDate(),
      },
    });

    return { isAbnormal: false };
  } catch (err) {
    error('community', '检测异常行为失败', err, userId);
    // 出错时允许操作，避免误判
    return { isAbnormal: false };
  }
}

/**
 * 点赞动态（带防刷检测）
 * @param {string} postId 动态ID
 * @param {string} userId 用户ID
 * @returns {Promise<Object>}
 */
async function likePost(postId, userId) {
  try {
    // 防刷检测
    const abnormalCheck = await detectAbnormalBehavior(userId, 'like');
    if (abnormalCheck.isAbnormal) {
      throw new Error(abnormalCheck.reason);
    }

    // 获取动态信息
    const postDoc = await db.collection('community_posts').doc(postId).get();
    if (!postDoc.data || postDoc.data.isDeleted) {
      throw new Error('动态不存在');
    }

    const post = postDoc.data;
    const likeUsers = post.likeUsers || [];
    const isLiked = likeUsers.includes(userId);

    if (isLiked) {
      // 取消点赞
      await db.collection('community_posts').doc(postId).update({
        data: {
          likeCount: _.inc(-1),
          likeUsers: _.pull(userId),
          updateTime: db.serverDate(),
        },
      });

      return { liked: false, likeCount: post.likeCount - 1 };
    } else {
      // 点赞
      await db.collection('community_posts').doc(postId).update({
        data: {
          likeCount: _.inc(1),
          likeUsers: _.push(userId),
          updateTime: db.serverDate(),
        },
      });

      return { liked: true, likeCount: post.likeCount + 1 };
    }
  } catch (err) {
    error('community', '点赞操作失败', err, userId);
    throw err;
  }
}

/**
 * 发布动态（带防刷检测）
 * @param {string} userId 用户ID
 * @param {Object} postData 动态数据
 * @returns {Promise<Object>}
 */
async function publishPost(userId, postData) {
  try {
    // 防刷检测
    const abnormalCheck = await detectAbnormalBehavior(userId, 'publish');
    if (abnormalCheck.isAbnormal) {
      throw new Error(abnormalCheck.reason);
    }

    // 获取用户信息
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.data || userDoc.data.isDeleted) {
      throw new Error('用户不存在');
    }

    const user = userDoc.data;

    // 创建动态
    const post = {
      userId: userId,
      userName: user.nickName || '微信用户',
      userAvatar: user.avatarUrl || '',
      content: postData.content,
      images: postData.images || [],
      recipeId: postData.recipeId || null,
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
      likeUsers: [],
      isDeleted: false,
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
    };

    const result = await db.collection('community_posts').add({
      data: post,
    });

    return {
      _id: result._id,
      ...post,
    };
  } catch (err) {
    error('community', '发布动态失败', err, userId);
    throw err;
  }
}

/**
 * 获取热门推荐
 * @param {Object} options 选项
 * @returns {Promise<Array>}
 */
async function getPopularPosts(options = {}) {
  const {
    limit = 20,
    category = null,
    timeRange = 7, // 天数
  } = options;

  try {
    const timeAgo = new Date();
    timeAgo.setDate(timeAgo.getDate() - timeRange);

    let query = db.collection('community_posts')
      .where({
        isDeleted: false,
        createTime: _.gte(timeAgo),
      });

    if (category) {
      query = query.where({ category });
    }

    const result = await query
      .orderBy('likeCount', 'desc')
      .orderBy('commentCount', 'desc')
      .orderBy('createTime', 'desc')
      .limit(limit * 2) // 多取一些用于计算热度
      .get();

    // 计算热度分数并排序
    const posts = result.data.map(post => {
      const popularityScore = calculatePopularityScore({
        likeCount: post.likeCount || 0,
        collectCount: post.collectCount || 0,
        commentCount: post.commentCount || 0,
        viewCount: post.viewCount || 0,
        createTime: post.createTime,
      }, {
        timeDecay: true,
        decayFactor: 0.95,
      });

      return {
        ...post,
        popularityScore,
      };
    });

    // 按热度分数排序
    posts.sort((a, b) => b.popularityScore - a.popularityScore);

    return posts.slice(0, limit);
  } catch (err) {
    error('community', '获取热门推荐失败', err);
    return [];
  }
}

/**
 * 获取相似用户推荐
 * @param {string} userId 用户ID
 * @param {number} limit 推荐数量
 * @returns {Promise<Array>}
 */
async function getSimilarUserRecommendations(userId, limit = 10) {
  try {
    // 获取当前用户画像
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.data) {
      return [];
    }

    const currentUser = {
      preferences: userDoc.data.preferences || [],
      dietaryRestrictions: userDoc.data.dietaryRestrictions || [],
      averageCalories: userDoc.data.averageCalories || 2000,
      foodCategories: userDoc.data.foodCategories || [],
      cookingDifficulty: userDoc.data.cookingDifficulty || '简单',
    };

    // 获取其他用户
    const usersResult = await db.collection('users')
      .where({
        _id: _.neq(userId),
        isDeleted: false,
      })
      .limit(100)
      .get();

    // 计算相似度
    const similarUsers = usersResult.data
      .map(user => {
        const userProfile = {
          preferences: user.preferences || [],
          dietaryRestrictions: user.dietaryRestrictions || [],
          averageCalories: user.averageCalories || 2000,
          foodCategories: user.foodCategories || [],
          cookingDifficulty: user.cookingDifficulty || '简单',
        };

        const similarity = calculateUserSimilarity(currentUser, userProfile);

        return {
          userId: user._id,
          nickName: user.nickName,
          avatarUrl: user.avatarUrl,
          similarity,
        };
      })
      .filter(user => user.similarity > 0.3) // 相似度阈值
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // 获取相似用户的动态
    if (similarUsers.length === 0) {
      return [];
    }

    const similarUserIds = similarUsers.map(u => u.userId);
    const postsResult = await db.collection('community_posts')
      .where({
        userId: _.in(similarUserIds),
        isDeleted: false,
      })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();

    return postsResult.data;
  } catch (err) {
    error('community', '获取相似用户推荐失败', err, userId);
    return [];
  }
}

/**
 * 获取个性化推荐
 * @param {string} userId 用户ID
 * @param {number} limit 推荐数量
 * @returns {Promise<Array>}
 */
async function getPersonalizedRecommendations(userId, limit = 20) {
  try {
    // 获取用户偏好和历史行为
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.data) {
      // 无用户数据，返回热门推荐
      return await getPopularPosts({ limit });
    }

    const user = userDoc.data;
    const preferences = user.preferences || [];
    const likedPosts = user.likedPosts || [];
    const viewedPosts = user.viewedPosts || [];

    // 获取候选动态
    const candidateResult = await db.collection('community_posts')
      .where({
        isDeleted: false,
        _id: _.nin([...likedPosts, ...viewedPosts].slice(-50)), // 排除最近看过的
      })
      .orderBy('createTime', 'desc')
      .limit(100)
      .get();

    // 计算个性化分数
    const scoredPosts = candidateResult.data.map(post => {
      let score = 0;

      // 标签匹配
      const postTags = post.tags || {};
      preferences.forEach(pref => {
        if (postTags[pref] === true) {
          score += 20;
        }
      });

      // 热度加权
      const popularityScore = calculatePopularityScore({
        likeCount: post.likeCount || 0,
        commentCount: post.commentCount || 0,
        viewCount: post.viewCount || 0,
        createTime: post.createTime,
      });
      score += popularityScore * 0.1;

      // 时间衰减（新内容加权）
      const daysSinceCreation = (Date.now() - new Date(post.createTime).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 1) {
        score += 30; // 24小时内新内容
      } else if (daysSinceCreation < 7) {
        score += 10; // 一周内
      }

      return {
        ...post,
        personalizedScore: score,
      };
    });

    // 排序并返回
    scoredPosts.sort((a, b) => b.personalizedScore - a.personalizedScore);

    // 保证多样性（避免同一用户的内容过多）
    const result = [];
    const userCounts = {};
    for (const post of scoredPosts) {
      if (result.length >= limit) break;
      
      const postUserId = post.userId;
      userCounts[postUserId] = (userCounts[postUserId] || 0) + 1;
      
      if (userCounts[postUserId] <= 3) { // 每个用户最多3条
        result.push(post);
      }
    }

    return result;
  } catch (err) {
    error('community', '获取个性化推荐失败', err, userId);
    // 降级到热门推荐
    return await getPopularPosts({ limit });
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  const { action, postId, data, options = {} } = event;

  return await logExecutionTime('community', async () => {
    try {
      if (!userId) {
        return {
          errCode: -1,
          errMsg: '用户未登录',
          data: null,
        };
      }

      // 频率限制检查
      const rateLimit = await checkRateLimit('community', userId);
      if (!rateLimit.allowed) {
        return {
          errCode: -2,
          errMsg: rateLimit.message,
          data: {
            resetTime: rateLimit.resetTime,
          },
        };
      }

      switch (action) {
        case 'like':
          // 点赞/取消点赞
          if (!postId) {
            return {
              errCode: -1,
              errMsg: '动态ID不能为空',
              data: null,
            };
          }

          const likeResult = await likePost(postId, userId);
          info('community', '点赞操作成功', { postId, ...likeResult }, userId);

          return {
            errCode: 0,
            errMsg: 'success',
            data: likeResult,
          };

        case 'publish':
          // 发布动态
          const validation = validate(data || {}, {
            content: {
              type: 'string',
              required: true,
              minLength: 1,
              maxLength: config.interaction.maxContentLength,
            },
            images: {
              type: 'array',
              required: false,
              maxLength: config.interaction.maxImages,
            },
            recipeId: {
              type: 'string',
              required: false,
            },
          });

          if (!validation.isValid) {
            return {
              errCode: -1,
              errMsg: validation.errors[0].message,
              data: null,
            };
          }

          const post = await publishPost(userId, data);
          info('community', '发布动态成功', { postId: post._id }, userId);

          return {
            errCode: 0,
            errMsg: 'success',
            data: post,
          };

        case 'getPopular':
          // 获取热门推荐
          const popularPosts = await getPopularPosts(options);
          return {
            errCode: 0,
            errMsg: 'success',
            data: {
              posts: popularPosts,
              count: popularPosts.length,
            },
          };

        case 'getSimilar':
          // 获取相似用户推荐
          const similarPosts = await getSimilarUserRecommendations(userId, options.limit || 10);
          return {
            errCode: 0,
            errMsg: 'success',
            data: {
              posts: similarPosts,
              count: similarPosts.length,
            },
          };

        case 'getPersonalized':
          // 获取个性化推荐
          const personalizedPosts = await getPersonalizedRecommendations(userId, options.limit || 20);
          return {
            errCode: 0,
            errMsg: 'success',
            data: {
              posts: personalizedPosts,
              count: personalizedPosts.length,
            },
          };

        case 'getFeed':
          // 获取综合推荐（热门+个性化混合）
          const [popular, personalized] = await Promise.all([
            getPopularPosts({ limit: Math.ceil((options.limit || 20) * 0.4) }),
            getPersonalizedRecommendations(userId, Math.ceil((options.limit || 20) * 0.6)),
          ]);

          // 合并并去重
          const allPosts = [...popular, ...personalized];
          const uniquePosts = [];
          const seenIds = new Set();
          for (const post of allPosts) {
            if (!seenIds.has(post._id)) {
              seenIds.add(post._id);
              uniquePosts.push(post);
            }
          }

          // 按时间排序
          uniquePosts.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));

          return {
            errCode: 0,
            errMsg: 'success',
            data: {
              posts: uniquePosts.slice(0, options.limit || 20),
              count: uniquePosts.length,
            },
          };

        case 'comment':
          // 评论功能（预留）
          return {
            errCode: -1,
            errMsg: '评论功能开发中',
            data: null,
          };

        default:
          return {
            errCode: -1,
            errMsg: `不支持的操作: ${action}`,
            data: null,
          };
      }
    } catch (err) {
      error('community', '社区互动操作失败', err, userId);
      return {
        errCode: -1,
        errMsg: err.message || '操作失败',
        data: null,
      };
    }
  }, { userId });
};
