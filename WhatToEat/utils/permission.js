/**
 * 权限管理模块
 * 统一处理小程序各种权限申请和降级处理
 */

import { getStorage, setStorage, STORAGE_KEYS } from './storage.js';
import { showModal, showToast } from './util.js';

/**
 * 权限类型常量
 */
export const PERMISSION_SCOPES = {
  USER_INFO: 'scope.userInfo',
  CAMERA: 'scope.camera',
  ALBUM: 'scope.album',
  LOCATION: 'scope.userLocation',
};

/**
 * 权限状态存储键名
 */
const PERMISSION_STORAGE_KEY = 'permission_status';

/**
 * 获取权限状态记录
 * @returns {Promise<Object>}
 */
async function getPermissionStatus() {
  const status = await getStorage(PERMISSION_STORAGE_KEY);
  return status || {};
}

/**
 * 更新权限状态记录
 * @param {string} scope 权限类型
 * @param {boolean} granted 是否授权
 */
async function updatePermissionStatus(scope, granted) {
  const status = await getPermissionStatus();
  const now = Date.now();
  
  if (!status[scope]) {
    status[scope] = {
      granted: false,
      deniedCount: 0,
      lastRequestTime: null,
      lastDeniedTime: null,
    };
  }
  
  if (granted) {
    status[scope].granted = true;
    status[scope].lastRequestTime = now;
    status[scope].deniedCount = 0;
  } else {
    status[scope].granted = false;
    status[scope].deniedCount = (status[scope].deniedCount || 0) + 1;
    status[scope].lastDeniedTime = now;
  }
  
  await setStorage(PERMISSION_STORAGE_KEY, status);
}

/**
 * 检查权限状态
 * @param {string} scope 权限类型
 * @returns {Promise<boolean>} 返回是否已授权
 */
export async function checkPermission(scope) {
  try {
    const res = await new Promise((resolve) => {
      wx.getSetting({
        success: (result) => {
          resolve(result);
        },
        fail: () => {
          resolve({ authSetting: {} });
        },
      });
    });
    
    return res.authSetting[scope] === true;
  } catch (err) {
    console.error('检查权限失败:', err);
    return false;
  }
}

/**
 * 申请权限
 * @param {string} scope 权限类型
 * @param {Object} options 选项
 * @param {string} options.desc 权限说明
 * @param {string} options.title 引导标题
 * @param {string} options.content 引导内容
 * @returns {Promise<boolean>} 返回是否授权成功
 */
export async function requestPermission(scope, options = {}) {
  const {
    desc = '需要您的授权才能使用此功能',
    title = '权限申请',
    content = '请在设置中开启相应权限',
  } = options;

  try {
    // 先检查是否已授权
    const isGranted = await checkPermission(scope);
    if (isGranted) {
      await updatePermissionStatus(scope, true);
      return true;
    }

    // 检查权限状态记录
    const status = await getPermissionStatus();
    const scopeStatus = status[scope];
    
    // 如果用户多次拒绝，显示引导提示
    if (scopeStatus && scopeStatus.deniedCount >= 2) {
      const result = await showModal(
        `${content}\n\n是否前往设置页面开启权限？`,
        title
      );
      
      if (result) {
        await openSetting();
        // 再次检查权限
        const newGranted = await checkPermission(scope);
        await updatePermissionStatus(scope, newGranted);
        return newGranted;
      }
      
      await updatePermissionStatus(scope, false);
      return false;
    }

    // 根据权限类型申请
    let granted = false;
    
    switch (scope) {
      case PERMISSION_SCOPES.CAMERA:
        granted = await requestCameraPermission(desc);
        break;
      case PERMISSION_SCOPES.ALBUM:
        granted = await requestAlbumPermission(desc);
        break;
      case PERMISSION_SCOPES.USER_INFO:
        granted = await requestUserInfoPermission(desc);
        break;
      case PERMISSION_SCOPES.LOCATION:
        granted = await requestLocationPermission(desc);
        break;
      default:
        console.warn('未知的权限类型:', scope);
        return false;
    }

    await updatePermissionStatus(scope, granted);
    return granted;
  } catch (err) {
    console.error('申请权限失败:', err);
    await updatePermissionStatus(scope, false);
    return false;
  }
}

/**
 * 申请相机权限
 * @param {string} desc 权限说明
 * @returns {Promise<boolean>}
 */
async function requestCameraPermission(desc) {
  return new Promise((resolve) => {
    wx.authorize({
      scope: PERMISSION_SCOPES.CAMERA,
      success: () => {
        resolve(true);
      },
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          // 用户拒绝，引导到设置页面
          showModal(
            '需要相机权限才能拍照识别菜品\n\n是否前往设置页面开启？',
            '权限申请'
          ).then((confirm) => {
            if (confirm) {
              openSetting().then(() => {
                checkPermission(PERMISSION_SCOPES.CAMERA).then(resolve);
              });
            } else {
              resolve(false);
            }
          });
        } else {
          resolve(false);
        }
      },
    });
  });
}

/**
 * 申请相册权限
 * @param {string} desc 权限说明
 * @returns {Promise<boolean>}
 */
async function requestAlbumPermission(desc) {
  return new Promise((resolve) => {
    wx.authorize({
      scope: PERMISSION_SCOPES.ALBUM,
      success: () => {
        resolve(true);
      },
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          showModal(
            '需要相册权限才能选择图片\n\n是否前往设置页面开启？',
            '权限申请'
          ).then((confirm) => {
            if (confirm) {
              openSetting().then(() => {
                checkPermission(PERMISSION_SCOPES.ALBUM).then(resolve);
              });
            } else {
              resolve(false);
            }
          });
        } else {
          resolve(false);
        }
      },
    });
  });
}

/**
 * 申请用户信息权限
 * @param {string} desc 权限说明
 * @returns {Promise<boolean>}
 */
async function requestUserInfoPermission(desc) {
  try {
    const userInfo = await new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: desc,
        success: (res) => {
          resolve(res.userInfo);
        },
        fail: (err) => {
          reject(err);
        },
      });
    });
    
    return !!userInfo;
  } catch (err) {
    if (err.errMsg && err.errMsg.includes('auth deny')) {
      showToast('需要用户信息权限才能完善个人资料', 'none');
    }
    return false;
  }
}

/**
 * 申请位置权限
 * @param {string} desc 权限说明
 * @returns {Promise<boolean>}
 */
async function requestLocationPermission(desc) {
  return new Promise((resolve) => {
    wx.authorize({
      scope: PERMISSION_SCOPES.LOCATION,
      success: () => {
        resolve(true);
      },
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          showModal(
            '需要位置权限才能使用此功能\n\n是否前往设置页面开启？',
            '权限申请'
          ).then((confirm) => {
            if (confirm) {
              openSetting().then(() => {
                checkPermission(PERMISSION_SCOPES.LOCATION).then(resolve);
              });
            } else {
              resolve(false);
            }
          });
        } else {
          resolve(false);
        }
      },
    });
  });
}

/**
 * 打开设置页面
 * @returns {Promise<Object>} 返回授权设置结果
 */
export async function openSetting() {
  return new Promise((resolve, reject) => {
    wx.openSetting({
      success: (res) => {
        resolve(res.authSetting);
      },
      fail: (err) => {
        reject(err);
      },
    });
  });
}

/**
 * 检查并申请相机权限（带降级处理）
 * @returns {Promise<boolean>}
 */
export async function ensureCameraPermission() {
  const granted = await checkPermission(PERMISSION_SCOPES.CAMERA);
  if (granted) {
    return true;
  }
  
  return await requestPermission(PERMISSION_SCOPES.CAMERA, {
    desc: '需要使用相机拍照识别菜品',
    title: '相机权限',
    content: '需要相机权限才能拍照识别菜品',
  });
}

/**
 * 检查并申请相册权限（带降级处理）
 * @returns {Promise<boolean>}
 */
export async function ensureAlbumPermission() {
  const granted = await checkPermission(PERMISSION_SCOPES.ALBUM);
  if (granted) {
    return true;
  }
  
  return await requestPermission(PERMISSION_SCOPES.ALBUM, {
    desc: '需要从相册选择图片识别菜品',
    title: '相册权限',
    content: '需要相册权限才能选择图片识别菜品',
  });
}

/**
 * 检查并申请用户信息权限（带降级处理）
 * @param {string} desc 权限说明
 * @returns {Promise<Object|null>} 返回用户信息或null
 */
export async function ensureUserInfoPermission(desc = '用于完善用户资料') {
  try {
    const userInfo = await requestUserInfoPermission(desc);
    return userInfo;
  } catch (err) {
    console.error('获取用户信息失败:', err);
    return null;
  }
}

/**
 * 批量检查权限
 * @param {Array<string>} scopes 权限类型数组
 * @returns {Promise<Object>} 返回权限状态对象
 */
export async function checkMultiplePermissions(scopes) {
  const results = {};
  
  for (const scope of scopes) {
    results[scope] = await checkPermission(scope);
  }
  
  return results;
}

/**
 * 获取权限拒绝次数
 * @param {string} scope 权限类型
 * @returns {Promise<number>}
 */
export async function getPermissionDeniedCount(scope) {
  const status = await getPermissionStatus();
  return status[scope]?.deniedCount || 0;
}
