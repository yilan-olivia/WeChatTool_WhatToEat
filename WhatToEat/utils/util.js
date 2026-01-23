/**
 * 通用工具函数
 * 包含防抖、节流等常用工具方法
 * 
 * 注意：日期时间相关函数已迁移到 date.js
 * 如需使用日期格式化等功能，请从 date.js 导入：
 * import { formatDate, formatRelativeTime } from './date.js';
 */

/**
 * 防抖函数
 * @param {Function} func 要防抖的函数
 * @param {number} wait 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * 节流函数
 * @param {Function} func 要节流的函数
 * @param {number} limit 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * 深拷贝对象
 * @param {any} obj 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
};

/**
 * 生成唯一ID
 * @returns {string} 唯一ID字符串
 */
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 显示提示信息
 * @param {string} title 提示内容
 * @param {string} icon 图标类型（success/error/loading/none）
 * @param {number} duration 显示时长（毫秒）
 */
export const showToast = (title, icon = 'none', duration = 2000) => {
  wx.showToast({
    title,
    icon,
    duration,
  });
};

/**
 * 显示成功提示
 * @param {string} title 提示内容
 * @param {number} duration 显示时长（毫秒）
 */
export const showSuccess = (title, duration = 2000) => {
  wx.showToast({
    title,
    icon: 'success',
    duration,
  });
};

/**
 * 显示错误提示
 * @param {string} title 提示内容
 * @param {number} duration 显示时长（毫秒）
 */
export const showError = (title, duration = 2000) => {
  wx.showToast({
    title,
    icon: 'error',
    duration,
  });
};

/**
 * 显示加载提示
 * @param {string} title 提示内容
 */
export const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true,
  });
};

/**
 * 隐藏加载提示
 */
export const hideLoading = () => {
  wx.hideLoading();
};

/**
 * 显示模态对话框
 * @param {string} content 对话框内容
 * @param {string} title 对话框标题
 * @param {Object} options 配置选项
 * @returns {Promise<Object>} 对话框结果
 */
export const showModal = (content, title = '提示', options = {}) => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      showCancel: options.showCancel !== false,
      cancelText: options.cancelText || '取消',
      confirmText: options.confirmText || '确定',
      success: (res) => {
        resolve(res);
      },
      fail: (err) => {
        console.error('显示对话框失败:', err);
        resolve({ confirm: false });
      },
    });
  });
};

/**
 * 显示操作菜单
 * @param {Array} itemList 菜单项列表
 * @param {Object} options 配置选项
 * @returns {Promise<Object>} 菜单选择结果
 */
export const showActionSheet = (itemList, options = {}) => {
  return new Promise((resolve) => {
    wx.showActionSheet({
      itemList,
      itemColor: options.itemColor,
      success: (res) => {
        resolve(res);
      },
      fail: (err) => {
        console.error('显示操作菜单失败:', err);
        resolve({ cancel: true });
      },
    });
  });
};