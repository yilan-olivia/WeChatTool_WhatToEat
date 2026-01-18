/**
 * 日期时间处理工具
 * 包含日期格式化、保质期计算、时间差显示、周月统计等功能
 */

/**
 * 格式化日期时间
 * @param {Date|number|string} date 日期对象或时间戳
 * @param {string} format 格式化模板，如 'YYYY-MM-DD HH:mm:ss'
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const second = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

/**
 * 格式化相对时间（如：刚刚、5分钟前、昨天等）
 * @param {Date|number|string} date 日期对象或时间戳
 * @returns {string} 相对时间字符串
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < 2 * day) {
    return '昨天';
  } else if (diff < 7 * day) {
    return `${Math.floor(diff / day)}天前`;
  } else {
    return formatDate(d, 'YYYY-MM-DD');
  }
}

/**
 * 计算保质期剩余天数
 * @param {Date|number|string} expireDate 过期日期
 * @returns {number} 剩余天数（负数表示已过期）
 */
export function getExpireDays(expireDate) {
  if (!expireDate) return null;
  
  const expire = expireDate instanceof Date ? expireDate : new Date(expireDate);
  if (isNaN(expire.getTime())) return null;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  expire.setHours(0, 0, 0, 0);
  
  const diff = expire.getTime() - now.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  
  return days;
}

/**
 * 判断是否已过期
 * @param {Date|number|string} expireDate 过期日期
 * @returns {boolean}
 */
export function isExpired(expireDate) {
  const days = getExpireDays(expireDate);
  return days !== null && days < 0;
}

/**
 * 判断是否即将过期（3天内）
 * @param {Date|number|string} expireDate 过期日期
 * @param {number} warningDays 警告天数，默认3天
 * @returns {boolean}
 */
export function isExpiringSoon(expireDate, warningDays = 3) {
  const days = getExpireDays(expireDate);
  return days !== null && days >= 0 && days <= warningDays;
}

/**
 * 获取保质期状态
 * @param {Date|number|string} expireDate 过期日期
 * @param {number} warningDays 警告天数，默认3天
 * @returns {string} 返回 'fresh' | 'warning' | 'expired'
 */
export function getExpireStatus(expireDate, warningDays = 3) {
  if (isExpired(expireDate)) {
    return 'expired';
  } else if (isExpiringSoon(expireDate, warningDays)) {
    return 'warning';
  } else {
    return 'fresh';
  }
}

/**
 * 格式化保质期显示
 * @param {Date|number|string} expireDate 过期日期
 * @returns {string}
 */
export function formatExpireDate(expireDate) {
  if (!expireDate) return '未设置';
  
  const days = getExpireDays(expireDate);
  
  if (days === null) {
    return formatDate(expireDate, 'YYYY-MM-DD');
  } else if (days < 0) {
    return `已过期 ${Math.abs(days)} 天`;
  } else if (days === 0) {
    return '今天过期';
  } else if (days === 1) {
    return '明天过期';
  } else if (days <= 7) {
    return `${days} 天后过期`;
  } else {
    return formatDate(expireDate, 'YYYY-MM-DD');
  }
}

/**
 * 计算精确时间差
 * @param {Date|number|string} startDate 开始日期
 * @param {Date|number|string} endDate 结束日期
 * @returns {Object} 返回 {days, hours, minutes, seconds}
 */
export function getTimeDiff(startDate, endDate) {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return null;
  }
  
  const diff = Math.abs(end.getTime() - start.getTime());
  const second = 1000;
  const minute = 60 * second;
  const hour = 60 * minute;
  const day = 24 * hour;
  
  return {
    days: Math.floor(diff / day),
    hours: Math.floor((diff % day) / hour),
    minutes: Math.floor((diff % hour) / minute),
    seconds: Math.floor((diff % minute) / second),
  };
}

/**
 * 获取周的开始日期（周一）
 * @param {Date|number|string} date 日期，默认为今天
 * @returns {Date}
 */
export function getWeekStart(date = new Date()) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一
  return new Date(d.setDate(diff));
}

/**
 * 获取周的结束日期（周日）
 * @param {Date|number|string} date 日期，默认为今天
 * @returns {Date}
 */
export function getWeekEnd(date = new Date()) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return weekEnd;
}

/**
 * 获取月的开始日期（1号）
 * @param {Date|number|string} date 日期，默认为今天
 * @returns {Date}
 */
export function getMonthStart(date = new Date()) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * 获取月的结束日期（最后一天）
 * @param {Date|number|string} date 日期，默认为今天
 * @returns {Date}
 */
export function getMonthEnd(date = new Date()) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/**
 * 获取日期范围内的所有日期
 * @param {Date|number|string} startDate 开始日期
 * @param {Date|number|string} endDate 结束日期
 * @returns {Array<Date>}
 */
export function getDateRange(startDate, endDate) {
  const start = startDate instanceof Date ? new Date(startDate) : new Date(startDate);
  const end = endDate instanceof Date ? new Date(endDate) : new Date(endDate);
  
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const dates = [];
  const current = new Date(start);
  
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * 获取最近N天的日期范围
 * @param {number} days 天数
 * @returns {Object} 返回 {startDate, endDate}
 */
export function getRecentDaysRange(days) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return {
    startDate: formatDate(startDate, 'YYYY-MM-DD'),
    endDate: formatDate(endDate, 'YYYY-MM-DD'),
  };
}

/**
 * 判断是否为同一天
 * @param {Date|number|string} date1 日期1
 * @param {Date|number|string} date2 日期2
 * @returns {boolean}
 */
export function isSameDay(date1, date2) {
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * 判断是否为同一周
 * @param {Date|number|string} date1 日期1
 * @param {Date|number|string} date2 日期2
 * @returns {boolean}
 */
export function isSameWeek(date1, date2) {
  const weekStart1 = getWeekStart(date1);
  const weekStart2 = getWeekStart(date2);
  return isSameDay(weekStart1, weekStart2);
}

/**
 * 判断是否为同一月
 * @param {Date|number|string} date1 日期1
 * @param {Date|number|string} date2 日期2
 * @returns {boolean}
 */
export function isSameMonth(date1, date2) {
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth()
  );
}
