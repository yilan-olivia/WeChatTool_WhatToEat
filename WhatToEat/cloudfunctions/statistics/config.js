/**
 * 统计数据云函数配置
 */

module.exports = {
  // 数据库集合名称
  collections: {
    foods: 'food_items',
    recipes: 'recipes',
    users: 'users',
    community: 'community_posts',
    reports: 'health_reports',
  },
  
  // 缓存配置（分钟）
  cache: {
    default: 5,
    expiring: 10,
  },
};
