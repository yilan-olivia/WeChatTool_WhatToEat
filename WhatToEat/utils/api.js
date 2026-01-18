/**
 * 网络请求封装（高级版）
 * 支持拦截器、token自动添加、错误统一处理、请求重试等
 */

import { getStorage, STORAGE_KEYS } from './storage.js';
import { showToast, showLoading, hideLoading } from './util.js';

/**
 * 请求配置
 */
const API_CONFIG = {
  baseURL: '', // API基础地址（如需要）
  timeout: 30000, // 请求超时时间
  retryCount: 2, // 重试次数
  retryDelay: 1000, // 重试延迟（毫秒）
};

/**
 * 请求拦截器列表
 */
const requestInterceptors = [];

/**
 * 响应拦截器列表
 */
const responseInterceptors = [];

/**
 * 添加请求拦截器
 * @param {Function} interceptor 拦截器函数
 */
export function addRequestInterceptor(interceptor) {
  requestInterceptors.push(interceptor);
}

/**
 * 添加响应拦截器
 * @param {Function} interceptor 拦截器函数
 */
export function addResponseInterceptor(interceptor) {
  responseInterceptors.push(interceptor);
}

/**
 * 执行请求拦截器
 * @param {Object} config 请求配置
 * @returns {Promise<Object>}
 */
async function executeRequestInterceptors(config) {
  let processedConfig = { ...config };
  
  for (const interceptor of requestInterceptors) {
    processedConfig = await interceptor(processedConfig) || processedConfig;
  }
  
  return processedConfig;
}

/**
 * 执行响应拦截器
 * @param {Object} response 响应对象
 * @returns {Promise<Object>}
 */
async function executeResponseInterceptors(response) {
  let processedResponse = response;
  
  for (const interceptor of responseInterceptors) {
    processedResponse = await interceptor(processedResponse) || processedResponse;
  }
  
  return processedResponse;
}

/**
 * 获取token
 * @returns {Promise<string|null>}
 */
async function getToken() {
  try {
    const token = await getStorage(STORAGE_KEYS.LOGIN_CODE);
    return token;
  } catch (err) {
    return null;
  }
}

/**
 * 默认请求拦截器：添加token
 */
addRequestInterceptor(async (config) => {
  const token = await getToken();
  if (token) {
    config.header = config.header || {};
    config.header['Authorization'] = `Bearer ${token}`;
  }
  
  // 添加公共参数
  config.header = {
    'Content-Type': 'application/json',
    ...config.header,
  };
  
  return config;
});

/**
 * 默认响应拦截器：统一错误处理
 */
addResponseInterceptor(async (response) => {
  // 处理HTTP错误
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`请求失败: ${response.statusCode}`);
  }
  
  // 处理业务错误
  if (response.data && response.data.errCode && response.data.errCode !== 0) {
    throw new Error(response.data.errMsg || '请求失败');
  }
  
  return response;
});

/**
 * 请求重试
 * @param {Function} requestFn 请求函数
 * @param {number} retryCount 剩余重试次数
 * @returns {Promise<any>}
 */
async function retryRequest(requestFn, retryCount) {
  try {
    return await requestFn();
  } catch (err) {
    if (retryCount > 0) {
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
      return retryRequest(requestFn, retryCount - 1);
    }
    throw err;
  }
}

/**
 * 发起网络请求
 * @param {Object} options 请求配置
 * @param {string} options.url 请求地址
 * @param {string} options.method 请求方法（GET/POST/PUT/DELETE）
 * @param {Object} options.data 请求数据
 * @param {Object} options.header 请求头
 * @param {boolean} options.showLoading 是否显示加载提示
 * @param {boolean} options.showError 是否显示错误提示
 * @param {boolean} options.retry 是否重试
 * @returns {Promise<Object>} 返回响应数据
 */
export async function request(options = {}) {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    showLoading: needLoading = false,
    showError: needError = true,
    retry = true,
  } = options;

  // 显示加载提示
  if (needLoading) {
    showLoading();
  }

  try {
    // 构建请求配置
    let config = {
      url: API_CONFIG.baseURL ? `${API_CONFIG.baseURL}${url}` : url,
      method: method.toUpperCase(),
      data,
      header,
      timeout: API_CONFIG.timeout,
    };

    // 执行请求拦截器
    config = await executeRequestInterceptors(config);

    // 发起请求（支持重试）
    const requestFn = () => {
      return new Promise((resolve, reject) => {
        wx.request({
          ...config,
          success: (res) => {
            resolve(res);
          },
          fail: (err) => {
            reject(err);
          },
        });
      });
    };

    const response = retry && method !== 'GET'
      ? await retryRequest(requestFn, API_CONFIG.retryCount)
      : await requestFn();

    // 执行响应拦截器
    const processedResponse = await executeResponseInterceptors(response);

    // 隐藏加载提示
    if (needLoading) {
      hideLoading();
    }

    return processedResponse.data || processedResponse;
  } catch (err) {
    // 隐藏加载提示
    if (needLoading) {
      hideLoading();
    }

    // 显示错误提示
    if (needError) {
      showToast(err.message || '网络请求失败', 'none');
    }

    throw err;
  }
}

/**
 * GET请求
 * @param {string} url 请求地址
 * @param {Object} params 请求参数
 * @param {Object} options 其他配置选项
 * @returns {Promise<Object>}
 */
export function get(url, params = {}, options = {}) {
  // 将参数拼接到URL上
  const queryString = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  const fullUrl = queryString ? `${url}?${queryString}` : url;

  return request({
    url: fullUrl,
    method: 'GET',
    ...options,
  });
}

/**
 * POST请求
 * @param {string} url 请求地址
 * @param {Object} data 请求数据
 * @param {Object} options 其他配置选项
 * @returns {Promise<Object>}
 */
export function post(url, data = {}, options = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...options,
  });
}

/**
 * PUT请求
 * @param {string} url 请求地址
 * @param {Object} data 请求数据
 * @param {Object} options 其他配置选项
 * @returns {Promise<Object>}
 */
export function put(url, data = {}, options = {}) {
  return request({
    url,
    method: 'PUT',
    data,
    ...options,
  });
}

/**
 * DELETE请求
 * @param {string} url 请求地址
 * @param {Object} options 其他配置选项
 * @returns {Promise<Object>}
 */
export function del(url, options = {}) {
  return request({
    url,
    method: 'DELETE',
    ...options,
  });
}

/**
 * 请求队列管理（防止重复请求）
 */
const requestQueue = new Map();

/**
 * 生成请求唯一标识
 * @param {string} url 请求地址
 * @param {string} method 请求方法
 * @param {Object} data 请求数据
 * @returns {string}
 */
function generateRequestKey(url, method, data) {
  return `${method}:${url}:${JSON.stringify(data)}`;
}

/**
 * 带去重的请求（短时间内相同请求只发送一次）
 * @param {Object} options 请求配置
 * @param {number} dedupeTime 去重时间窗口（毫秒）
 * @returns {Promise<Object>}
 */
export function requestWithDedupe(options = {}, dedupeTime = 1000) {
  const key = generateRequestKey(options.url, options.method, options.data);
  const now = Date.now();
  
  // 检查是否有相同的请求正在进行
  const existingRequest = requestQueue.get(key);
  if (existingRequest && (now - existingRequest.time) < dedupeTime) {
    return existingRequest.promise;
  }
  
  // 创建新请求
  const promise = request(options).finally(() => {
    requestQueue.delete(key);
  });
  
  requestQueue.set(key, {
    promise,
    time: now,
  });
  
  return promise;
}

/**
 * 取消请求（小程序不支持，预留接口）
 * @param {string} url 请求地址
 */
export function cancelRequest(url) {
  // 小程序不支持取消请求，这里只是清理队列
  for (const [key] of requestQueue) {
    if (key.includes(url)) {
      requestQueue.delete(key);
    }
  }
}

/**
 * 设置API配置
 * @param {Object} config 配置对象
 */
export function setApiConfig(config) {
  Object.assign(API_CONFIG, config);
}
