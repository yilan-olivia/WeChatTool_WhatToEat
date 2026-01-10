/**
 * 网络请求封装
 * 用于后续集成AI大模型API等外部服务
 */

import { aiApiConfig } from '../config/api.js';
import { showToast, showLoading, hideLoading } from './util.js';

/**
 * 发起网络请求
 * @param {Object} options 请求配置
 * @param {string} options.url 请求地址
 * @param {string} options.method 请求方法（GET/POST等）
 * @param {Object} options.data 请求数据
 * @param {Object} options.header 请求头
 * @param {boolean} options.showLoading 是否显示加载提示
 * @param {boolean} options.showError 是否显示错误提示
 * @returns {Promise<Object>} 返回响应数据
 */
export const request = async (options = {}) => {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    showLoading: needLoading = false,
    showError: needError = true,
  } = options;

  // 显示加载提示
  if (needLoading) {
    showLoading();
  }

  try {
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          ...header,
        },
        timeout: aiApiConfig.timeout || 30000,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res);
          } else {
            reject(new Error(`请求失败: ${res.statusCode}`));
          }
        },
        fail: (err) => {
          reject(err);
        },
      });
    });

    // 隐藏加载提示
    if (needLoading) {
      hideLoading();
    }

    return response.data;
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
};

/**
 * GET请求
 * @param {string} url 请求地址
 * @param {Object} params 请求参数
 * @param {Object} options 其他配置选项
 * @returns {Promise<Object>}
 */
export const get = (url, params = {}, options = {}) => {
  // 将参数拼接到URL上
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  const fullUrl = queryString ? `${url}?${queryString}` : url;

  return request({
    url: fullUrl,
    method: 'GET',
    ...options,
  });
};

/**
 * POST请求
 * @param {string} url 请求地址
 * @param {Object} data 请求数据
 * @param {Object} options 其他配置选项
 * @returns {Promise<Object>}
 */
export const post = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'POST',
    data,
    ...options,
  });
};

/**
 * 调用云函数
 * @param {string} name 云函数名称
 * @param {Object} data 传递给云函数的数据
 * @param {Object} options 其他配置选项
 * @returns {Promise<Object>}
 */
export const callCloudFunction = async (name, data = {}, options = {}) => {
  const { showLoading: needLoading = true, showError: needError = true } = options;

  if (needLoading) {
    showLoading('处理中...');
  }

  try {
    const result = await wx.cloud.callFunction({
      name,
      data,
    });

    if (needLoading) {
      hideLoading();
    }

    if (result.result && result.result.errCode) {
      throw new Error(result.result.errMsg || '云函数调用失败');
    }

    return result.result;
  } catch (err) {
    if (needLoading) {
      hideLoading();
    }

    if (needError) {
      showToast(err.message || '操作失败', 'none');
    }

    throw err;
  }
};
