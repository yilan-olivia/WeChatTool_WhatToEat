/**
 * 健康报告生成云函数配置
 */

module.exports = {
  // 报告生成配置
  report: {
    // 默认时间范围（天）
    defaultDays: 7,
    // 最大时间范围（天）
    maxDays: 90,
    // 过期提醒天数
    expireWarningDays: 3,
  },
};
