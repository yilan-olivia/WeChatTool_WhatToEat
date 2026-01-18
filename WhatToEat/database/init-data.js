/**
 * 数据库初始化脚本
 * 用于插入示例数据，便于开发和测试
 * 
 * 使用方法：
 * 1. 在云函数中运行此脚本
 * 2. 或在小程序开发工具中创建临时页面执行
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

/**
 * 获取当前用户ID（用于测试）
 */
function getTestUserId() {
  // 在实际使用中，应该从云函数上下文获取
  return 'test_user_' + Date.now();
}

/**
 * 插入示例菜品数据
 */
async function initFoodItems(userId) {
  const foods = [
    {
      name: '西红柿',
      category: '蔬菜',
      image: 'cloud://test-env.xxxx/foods/tomato.jpg',
      expireDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3天后
      status: 'fresh',
      remark: '新鲜西红柿，适合做菜',
      userId: userId,
      isDeleted: false,
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
    },
    {
      name: '鸡蛋',
      category: '其他',
      image: 'cloud://test-env.xxxx/foods/egg.jpg',
      expireDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后
      status: 'fresh',
      remark: '土鸡蛋',
      userId: userId,
      isDeleted: false,
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
    },
    {
      name: '苹果',
      category: '水果',
      image: 'cloud://test-env.xxxx/foods/apple.jpg',
      expireDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1天后
      status: 'warning',
      remark: '即将过期，尽快食用',
      userId: userId,
      isDeleted: false,
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
    },
    {
      name: '牛肉',
      category: '肉类',
      image: 'cloud://test-env.xxxx/foods/beef.jpg',
      expireDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 已过期
      status: 'expired',
      remark: '已过期，建议丢弃',
      userId: userId,
      isDeleted: false,
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
    },
  ];

  try {
    const result = await db.collection('food_items').add({
      data: foods,
    });
    console.log('插入菜品数据成功:', result);
    return result._ids;
  } catch (err) {
    console.error('插入菜品数据失败:', err);
    throw err;
  }
}

/**
 * 插入示例用户数据
 */
async function initUser(userId) {
  const user = {
    _id: userId,
    nickName: '测试用户',
    avatarUrl: 'https://wx.qlogo.cn/mmopen/xxxx',
    gender: 0,
    country: '中国',
    province: '北京',
    city: '北京',
    language: 'zh_CN',
    settings: {
      notifications: {
        expireReminder: true,
        recipeRecommend: true,
        communityUpdate: false,
      },
      privacy: {
        showProfile: true,
        showStatistics: false,
      },
    },
    statistics: {
      totalFoods: 0,
      totalRecipes: 0,
      totalReports: 0,
      lastActiveDate: null,
    },
    isDeleted: false,
    createTime: db.serverDate(),
    updateTime: db.serverDate(),
    lastLoginTime: db.serverDate(),
  };

  try {
    const result = await db.collection('users').add({
      data: user,
    });
    console.log('插入用户数据成功:', result);
    return result._ids[0];
  } catch (err) {
    // 如果用户已存在，更新用户信息
    if (err.errCode === -1) {
      await db.collection('users').doc(userId).update({
        data: {
          ...user,
          updateTime: db.serverDate(),
        },
      });
      console.log('更新用户数据成功');
      return userId;
    }
    console.error('插入用户数据失败:', err);
    throw err;
  }
}

/**
 * 插入示例食谱数据
 */
async function initRecipes(userId, foodIds) {
  const recipes = [
    {
      name: '西红柿鸡蛋',
      difficulty: '简单',
      time: '15分钟',
      calories: 200,
      protein: 12,
      fat: 8,
      carbs: 15,
      ingredients: [
        { name: '西红柿', amount: '2个', unit: '个' },
        { name: '鸡蛋', amount: '3个', unit: '个' },
      ],
      steps: [
        { step: 1, description: '将西红柿洗净切块' },
        { step: 2, description: '鸡蛋打散备用' },
        { step: 3, description: '热锅下油，炒鸡蛋' },
        { step: 4, description: '加入西红柿翻炒，调味即可' },
      ],
      images: [],
      userId: userId,
      foodIds: foodIds.slice(0, 2), // 关联前两个菜品
      preference: '清淡',
      likeCount: 0,
      viewCount: 0,
      isPublic: true,
      isDeleted: false,
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
    },
    {
      name: '苹果沙拉',
      difficulty: '简单',
      time: '10分钟',
      calories: 150,
      protein: 2,
      fat: 5,
      carbs: 25,
      ingredients: [
        { name: '苹果', amount: '2个', unit: '个' },
        { name: '沙拉酱', amount: '适量', unit: '克' },
      ],
      steps: [
        { step: 1, description: '苹果洗净切块' },
        { step: 2, description: '加入沙拉酱拌匀即可' },
      ],
      images: [],
      userId: userId,
      foodIds: [foodIds[2]], // 关联苹果
      preference: '清淡',
      likeCount: 5,
      viewCount: 20,
      isPublic: true,
      isDeleted: false,
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
    },
  ];

  try {
    const result = await db.collection('recipes').add({
      data: recipes,
    });
    console.log('插入食谱数据成功:', result);
    return result._ids;
  } catch (err) {
    console.error('插入食谱数据失败:', err);
    throw err;
  }
}

/**
 * 插入示例社区动态数据
 */
async function initCommunityPosts(userId, recipeIds) {
  const posts = [
    {
      userId: userId,
      userName: '测试用户',
      userAvatar: 'https://wx.qlogo.cn/mmopen/xxxx',
      content: '今天做了西红柿鸡蛋，味道不错！',
      images: [],
      recipeId: recipeIds[0],
      likeCount: 10,
      commentCount: 3,
      likeUsers: [],
      isDeleted: false,
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
    },
    {
      userId: userId,
      userName: '测试用户',
      userAvatar: 'https://wx.qlogo.cn/mmopen/xxxx',
      content: '分享一个简单的苹果沙拉做法，健康又美味！',
      images: [],
      recipeId: recipeIds[1],
      likeCount: 25,
      commentCount: 8,
      likeUsers: [],
      isDeleted: false,
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
    },
  ];

  try {
    const result = await db.collection('community_posts').add({
      data: posts,
    });
    console.log('插入社区动态数据成功:', result);
    return result._ids;
  } catch (err) {
    console.error('插入社区动态数据失败:', err);
    throw err;
  }
}

/**
 * 插入示例健康报告数据
 */
async function initHealthReports(userId) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7); // 7天前
  const endDate = new Date();

  const report = {
    userId: userId,
    startDate: startDate,
    endDate: endDate,
    totalFoods: 4,
    totalRecipes: 2,
    avgCalories: 175,
    categoryStats: [
      { category: '蔬菜', count: 1, percentage: 25.0 },
      { category: '水果', count: 1, percentage: 25.0 },
      { category: '肉类', count: 1, percentage: 25.0 },
      { category: '其他', count: 1, percentage: 25.0 },
    ],
    wasteCount: 1,
    tips: [
      '建议增加菜品多样性，保证营养均衡',
      '本周有1个菜品过期，建议合理规划采购和食用计划',
    ],
    isDeleted: false,
    createTime: db.serverDate(),
    updateTime: db.serverDate(),
  };

  try {
    const result = await db.collection('health_reports').add({
      data: report,
    });
    console.log('插入健康报告数据成功:', result);
    return result._ids[0];
  } catch (err) {
    console.error('插入健康报告数据失败:', err);
    throw err;
  }
}

/**
 * 主函数：初始化所有数据
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID || getTestUserId();

  try {
    console.log('开始初始化数据，用户ID:', userId);

    // 1. 初始化用户
    await initUser(userId);

    // 2. 初始化菜品
    const foodIds = await initFoodItems(userId);

    // 3. 初始化食谱
    const recipeIds = await initRecipes(userId, foodIds);

    // 4. 初始化社区动态
    await initCommunityPosts(userId, recipeIds);

    // 5. 初始化健康报告
    await initHealthReports(userId);

    console.log('数据初始化完成');

    return {
      errCode: 0,
      errMsg: 'success',
      data: {
        userId,
        foodIds,
        recipeIds,
      },
    };
  } catch (err) {
    console.error('数据初始化失败:', err);
    return {
      errCode: -1,
      errMsg: err.message || '初始化失败',
      data: null,
    };
  }
};

/**
 * 清理测试数据（可选）
 */
async function cleanTestData(userId) {
  try {
    // 软删除所有测试数据
    await Promise.all([
      db.collection('food_items')
        .where({ userId: userId })
        .update({ data: { isDeleted: true } }),
      db.collection('recipes')
        .where({ userId: userId })
        .update({ data: { isDeleted: true } }),
      db.collection('community_posts')
        .where({ userId: userId })
        .update({ data: { isDeleted: true } }),
      db.collection('health_reports')
        .where({ userId: userId })
        .update({ data: { isDeleted: true } }),
    ]);

    console.log('测试数据清理完成');
  } catch (err) {
    console.error('清理测试数据失败:', err);
    throw err;
  }
}
