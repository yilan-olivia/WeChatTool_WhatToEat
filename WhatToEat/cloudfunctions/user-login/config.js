/**
 * 用户登录管理云函数配置
 */

module.exports = {
  // 用户配置
  user: {
    // 默认设置
    defaultSettings: {
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
    // 默认统计数据
    defaultStatistics: {
      totalFoods: 0,
      totalRecipes: 0,
      totalReports: 0,
      lastActiveDate: null,
    },
  },
};
