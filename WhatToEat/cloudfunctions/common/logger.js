/**
 * 日志记录工具
 * 提供统一的日志记录功能
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 日志级别
 */
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

/**
 * 日志配置
 */
const LOG_CONFIG = {
  // 是否保存到数据库
  saveToDatabase: true,
  // 日志集合名称
  collectionName: 'cloud_function_logs',
  // 是否在控制台输出
  consoleOutput: true,
  // 日志保留天数
  retentionDays: 7,
};

/**
 * 记录日志
 * @param {string} level 日志级别
 * @param {string} functionName 云函数名称
 * @param {string} message 日志消息
 * @param {Object} data 附加数据
 * @param {string} userId 用户ID（可选）
 */
async function log(level, functionName, message, data = {}, userId = null) {
  const logEntry = {
    level,
    functionName,
    message,
    data: JSON.stringify(data),
    userId: userId || null,
    timestamp: Date.now(),
    createTime: db.serverDate(),
  };

  // 控制台输出
  if (LOG_CONFIG.consoleOutput) {
    const logMethod = level === LOG_LEVELS.ERROR ? console.error : 
                     level === LOG_LEVELS.WARN ? console.warn :
                     level === LOG_LEVELS.DEBUG ? console.debug : console.log;
    
    logMethod(`[${level.toUpperCase()}] [${functionName}] ${message}`, data);
  }

  // 保存到数据库
  if (LOG_CONFIG.saveToDatabase) {
    try {
      await db.collection(LOG_CONFIG.collectionName).add({
        data: logEntry,
      });
    } catch (err) {
      // 日志记录失败不应该影响主流程
      console.error('保存日志到数据库失败:', err);
    }
  }
}

/**
 * 记录调试日志
 */
function debug(functionName, message, data = {}, userId = null) {
  return log(LOG_LEVELS.DEBUG, functionName, message, data, userId);
}

/**
 * 记录信息日志
 */
function info(functionName, message, data = {}, userId = null) {
  return log(LOG_LEVELS.INFO, functionName, message, data, userId);
}

/**
 * 记录警告日志
 */
function warn(functionName, message, data = {}, userId = null) {
  return log(LOG_LEVELS.WARN, functionName, message, data, userId);
}

/**
 * 记录错误日志
 */
function error(functionName, message, error = null, userId = null) {
  const errorData = error ? {
    message: error.message,
    stack: error.stack,
    name: error.name,
  } : {};
  
  return log(LOG_LEVELS.ERROR, functionName, message, errorData, userId);
}

/**
 * 记录函数执行时间
 * @param {string} functionName 云函数名称
 * @param {Function} fn 要执行的函数
 * @param {Object} context 上下文数据
 * @returns {Promise<any>}
 */
async function logExecutionTime(functionName, fn, context = {}) {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const executionTime = Date.now() - startTime;
    
    info(functionName, '函数执行完成', {
      ...context,
      executionTime: `${executionTime}ms`,
    });
    
    return result;
  } catch (err) {
    const executionTime = Date.now() - startTime;
    
    error(functionName, '函数执行失败', err, context.userId);
    
    throw err;
  }
}

/**
 * 清理过期日志
 */
async function cleanExpiredLogs() {
  try {
    const retentionTime = Date.now() - LOG_CONFIG.retentionDays * 24 * 60 * 60 * 1000;
    
    const result = await db.collection(LOG_CONFIG.collectionName)
      .where({
        timestamp: db.command.lt(retentionTime),
      })
      .remove();
    
    if (result.stats.removed > 0) {
      console.log(`清理了 ${result.stats.removed} 条过期日志`);
    }
    
    return result;
  } catch (err) {
    console.error('清理过期日志失败:', err);
    throw err;
  }
}

module.exports = {
  log,
  debug,
  info,
  warn,
  error,
  logExecutionTime,
  cleanExpiredLogs,
  LOG_LEVELS,
  LOG_CONFIG,
};
