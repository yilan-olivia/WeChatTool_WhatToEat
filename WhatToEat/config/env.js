/**
 * 云开发环境配置
 * 请在小程序后台创建云开发环境后，将环境ID填写到 cloudEnvId 中
 */
export const cloudEnvId = 'cloud1-6gvnsmzv0f2da326'; // 云开发环境ID，需要在小程序后台获取

/**
 * 云开发环境配置对象
 */
export const cloudConfig = {
  env: cloudEnvId, // 云开发环境ID
  traceUser: true, // 是否在将用户访问记录到用户管理中
};

/**
 * 数据库集合名称配置
 */
export const dbCollections = {
  users: 'users', // 用户信息集合
  foods: 'food_items', // 菜品信息集合
  recipes: 'recipes', // 食谱集合
  community: 'community_posts', // 社区动态集合
  reports: 'health_reports', // 健康报告集合
};

/**
 * 订阅消息模板ID配置
 * 需要在微信公众平台配置订阅消息模板，获取模板ID后填写到这里
 * 
 * 过期提醒模板字段说明：
 * - thing1: 物资名称（菜品名称，最多20个字符）
 * - number2: 剩余天数（数字类型）
 */
export const subscribeMessageTemplates = {
  expireReminder: 'p8zlAlgoM-MLomAaCNcn5gefJAweSsnxSmLX1Tm1Y6U', // 过期提醒模板ID
};