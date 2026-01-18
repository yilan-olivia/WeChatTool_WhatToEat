/**
 * 调试工具
 * 提供环境判断、日志分级、性能监控、错误上报等功能
 */

/**
 * 环境配置
 */
const ENV_CONFIG = {
  // 判断是否为开发环境
  isDev: () => {
    // 可以通过编译条件或配置判断
    // 这里使用简单的判断方式
    try {
      const accountInfo = wx.getAccountInfoSync();
      return accountInfo.miniProgram.envVersion === 'develop' || 
             accountInfo.miniProgram.envVersion === 'trial';
    } catch (err) {
      // 如果获取失败，默认开发环境
      return true;
    }
  },
  
  // 当前环境
  current: null,
};

// 初始化环境
ENV_CONFIG.current = ENV_CONFIG.isDev() ? 'development' : 'production';

/**
 * 日志级别
 */
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

/**
 * 日志配置
 */
const LOG_CONFIG = {
  level: ENV_CONFIG.current === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO,
  enableConsole: true,
  enableStorage: ENV_CONFIG.current === 'development', // 开发环境才存储日志
  maxStorageLogs: 100, // 最大存储日志数量
};

/**
 * 存储的日志
 */
let storedLogs = [];

/**
 * 日志输出
 * @param {string} level 日志级别
 * @param {string} message 日志消息
 * @param {any} data 附加数据
 */
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    level,
    message,
    data,
    timestamp,
    env: ENV_CONFIG.current,
  };

  // 控制台输出
  if (LOG_CONFIG.enableConsole) {
    const consoleMethod = level === LOG_LEVELS.ERROR ? console.error :
                         level === LOG_LEVELS.WARN ? console.warn :
                         level === LOG_LEVELS.DEBUG ? console.debug : console.log;
    
    consoleMethod(`[${level.toUpperCase()}] ${message}`, data);
  }

  // 存储日志（仅开发环境）
  if (LOG_CONFIG.enableStorage && level !== LOG_LEVELS.DEBUG) {
    storedLogs.push(logEntry);
    
    // 限制存储数量
    if (storedLogs.length > LOG_CONFIG.maxStorageLogs) {
      storedLogs.shift();
    }
  }

  // 错误级别自动上报
  if (level === LOG_LEVELS.ERROR) {
    reportError(message, data);
  }
}

/**
 * Debug日志
 * @param {string} message 消息
 * @param {any} data 数据
 */
export function debug(message, data) {
  if (LOG_CONFIG.level === LOG_LEVELS.DEBUG) {
    log(LOG_LEVELS.DEBUG, message, data);
  }
}

/**
 * Info日志
 * @param {string} message 消息
 * @param {any} data 数据
 */
export function info(message, data) {
  if ([LOG_LEVELS.DEBUG, LOG_LEVELS.INFO].includes(LOG_CONFIG.level)) {
    log(LOG_LEVELS.INFO, message, data);
  }
}

/**
 * Warn日志
 * @param {string} message 消息
 * @param {any} data 数据
 */
export function warn(message, data) {
  if ([LOG_LEVELS.DEBUG, LOG_LEVELS.INFO, LOG_LEVELS.WARN].includes(LOG_CONFIG.level)) {
    log(LOG_LEVELS.WARN, message, data);
  }
}

/**
 * Error日志
 * @param {string} message 消息
 * @param {any} data 数据
 */
export function error(message, data) {
  log(LOG_LEVELS.ERROR, message, data);
}

/**
 * 性能监控
 */
const performanceMonitor = {
  timers: new Map(),
  
  /**
   * 开始计时
   * @param {string} name 计时器名称
   */
  start(name) {
    this.timers.set(name, Date.now());
  },
  
  /**
   * 结束计时
   * @param {string} name 计时器名称
   * @returns {number} 耗时（毫秒）
   */
  end(name) {
    const startTime = this.timers.get(name);
    if (!startTime) {
      warn(`性能监控: 未找到计时器 ${name}`);
      return 0;
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(name);
    
    if (ENV_CONFIG.current === 'development') {
      debug(`性能监控 [${name}]: ${duration}ms`);
    }
    
    return duration;
  },
  
  /**
   * 测量函数执行时间
   * @param {string} name 名称
   * @param {Function} fn 要执行的函数
   * @returns {Promise<any>}
   */
  async measure(name, fn) {
    this.start(name);
    try {
      const result = await fn();
      const duration = this.end(name);
      return { result, duration };
    } catch (err) {
      this.end(name);
      throw err;
    }
  },
};

/**
 * 开始性能监控
 * @param {string} name 监控名称
 */
export function startPerformance(name) {
  performanceMonitor.start(name);
}

/**
 * 结束性能监控
 * @param {string} name 监控名称
 * @returns {number} 耗时（毫秒）
 */
export function endPerformance(name) {
  return performanceMonitor.end(name);
}

/**
 * 测量函数执行时间
 * @param {string} name 名称
 * @param {Function} fn 要执行的函数
 * @returns {Promise<any>}
 */
export async function measurePerformance(name, fn) {
  return await performanceMonitor.measure(name, fn);
}

/**
 * 错误上报
 * @param {string} message 错误消息
 * @param {any} data 错误数据
 */
function reportError(message, data) {
  // 这里可以集成第三方错误上报服务
  // 例如：Sentry、Bugly等
  
  if (ENV_CONFIG.current === 'production') {
    // 生产环境上报错误
    // 示例：可以调用云函数上报
    // wx.cloud.callFunction({
    //   name: 'report-error',
    //   data: { message, data, timestamp: Date.now() }
    // }).catch(() => {});
  }
}

/**
 * 获取存储的日志
 * @returns {Array}
 */
export function getStoredLogs() {
  return [...storedLogs];
}

/**
 * 清除存储的日志
 */
export function clearStoredLogs() {
  storedLogs = [];
}

/**
 * 获取环境信息
 * @returns {Object}
 */
export function getEnvInfo() {
  try {
    const accountInfo = wx.getAccountInfoSync();
    const systemInfo = wx.getSystemInfoSync();
    
    return {
      env: ENV_CONFIG.current,
      version: accountInfo.miniProgram.version,
      envVersion: accountInfo.miniProgram.envVersion,
      platform: systemInfo.platform,
      system: systemInfo.system,
      SDKVersion: systemInfo.SDKVersion,
    };
  } catch (err) {
    return {
      env: ENV_CONFIG.current,
      error: err.message,
    };
  }
}

/**
 * 设置日志级别
 * @param {string} level 日志级别
 */
export function setLogLevel(level) {
  if (Object.values(LOG_LEVELS).includes(level)) {
    LOG_CONFIG.level = level;
  }
}

/**
 * 判断是否为开发环境
 * @returns {boolean}
 */
export function isDevelopment() {
  return ENV_CONFIG.current === 'development';
}

/**
 * 判断是否为生产环境
 * @returns {boolean}
 */
export function isProduction() {
  return ENV_CONFIG.current === 'production';
}
