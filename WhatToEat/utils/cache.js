/**
 * 本地缓存管理
 * 支持过期时间、大小限制、自动清理等功能
 */

import { getStorage, setStorage, removeStorage, getStorageInfo } from './storage.js';

/**
 * 缓存配置
 */
const CACHE_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 最大缓存大小：10MB
  defaultExpire: 7 * 24 * 60 * 60 * 1000, // 默认过期时间：7天
  imageCachePrefix: 'img_cache_', // 图片缓存前缀
  dataCachePrefix: 'data_cache_', // 数据缓存前缀
};

/**
 * 缓存元数据键名
 */
const CACHE_META_KEY = 'cache_metadata';

/**
 * 获取缓存元数据
 * @returns {Promise<Object>}
 */
async function getCacheMetadata() {
  const metadata = await getStorage(CACHE_META_KEY);
  return metadata || {
    items: [],
    totalSize: 0,
  };
}

/**
 * 更新缓存元数据
 * @param {Object} metadata 元数据对象
 */
async function updateCacheMetadata(metadata) {
  await setStorage(CACHE_META_KEY, metadata);
}

/**
 * 计算数据大小（估算）
 * @param {any} data 数据
 * @returns {number} 大小（字节）
 */
function estimateSize(data) {
  try {
    return JSON.stringify(data).length;
  } catch (err) {
    return 0;
  }
}

/**
 * 设置缓存
 * @param {string} key 缓存键名
 * @param {any} value 缓存值
 * @param {number} expireTime 过期时间（毫秒），0表示不过期
 * @returns {Promise<void>}
 */
export async function setCache(key, value, expireTime = CACHE_CONFIG.defaultExpire) {
  try {
    const now = Date.now();
    const expireAt = expireTime > 0 ? now + expireTime : 0;
    const size = estimateSize(value);
    
    const cacheItem = {
      key,
      value,
      expireAt,
      size,
      createTime: now,
    };
    
    // 保存缓存数据
    await setStorage(key, cacheItem);
    
    // 更新元数据
    const metadata = await getCacheMetadata();
    const existingIndex = metadata.items.findIndex(item => item.key === key);
    
    if (existingIndex >= 0) {
      // 更新现有项
      const oldSize = metadata.items[existingIndex].size;
      metadata.items[existingIndex] = {
        key,
        expireAt,
        size,
        createTime: now,
      };
      metadata.totalSize = metadata.totalSize - oldSize + size;
    } else {
      // 添加新项
      metadata.items.push({
        key,
        expireAt,
        size,
        createTime: now,
      });
      metadata.totalSize += size;
    }
    
    await updateCacheMetadata(metadata);
    
    // 检查缓存大小，超出限制时清理
    if (metadata.totalSize > CACHE_CONFIG.maxSize) {
      await clearOldestCache();
    }
  } catch (err) {
    console.error('设置缓存失败:', err);
    throw err;
  }
}

/**
 * 获取缓存
 * @param {string} key 缓存键名
 * @returns {Promise<any>} 返回缓存值，如果不存在或已过期返回null
 */
export async function getCache(key) {
  try {
    const cacheItem = await getStorage(key);
    
    if (!cacheItem || !cacheItem.value) {
      return null;
    }
    
    // 检查是否过期
    if (cacheItem.expireAt && cacheItem.expireAt < Date.now()) {
      // 已过期，删除缓存
      await removeCache(key);
      return null;
    }
    
    return cacheItem.value;
  } catch (err) {
    console.error('获取缓存失败:', err);
    return null;
  }
}

/**
 * 删除缓存
 * @param {string} key 缓存键名
 * @returns {Promise<void>}
 */
export async function removeCache(key) {
  try {
    await removeStorage(key);
    
    // 更新元数据
    const metadata = await getCacheMetadata();
    const index = metadata.items.findIndex(item => item.key === key);
    
    if (index >= 0) {
      const item = metadata.items[index];
      metadata.totalSize -= item.size;
      metadata.items.splice(index, 1);
      await updateCacheMetadata(metadata);
    }
  } catch (err) {
    console.error('删除缓存失败:', err);
  }
}

/**
 * 清除所有缓存
 * @returns {Promise<void>}
 */
export async function clearAllCache() {
  try {
    const metadata = await getCacheMetadata();
    
    // 删除所有缓存项
    for (const item of metadata.items) {
      await removeStorage(item.key);
    }
    
    // 重置元数据
    await updateCacheMetadata({
      items: [],
      totalSize: 0,
    });
  } catch (err) {
    console.error('清除所有缓存失败:', err);
    throw err;
  }
}

/**
 * 清除过期缓存
 * @returns {Promise<number>} 返回清除的缓存数量
 */
export async function clearExpiredCache() {
  try {
    const metadata = await getCacheMetadata();
    const now = Date.now();
    let clearedCount = 0;
    
    const validItems = [];
    
    for (const item of metadata.items) {
      if (item.expireAt && item.expireAt < now) {
        // 已过期，删除
        await removeStorage(item.key);
        clearedCount++;
      } else {
        validItems.push(item);
      }
    }
    
    // 重新计算总大小
    metadata.totalSize = validItems.reduce((sum, item) => sum + item.size, 0);
    metadata.items = validItems;
    
    await updateCacheMetadata(metadata);
    
    return clearedCount;
  } catch (err) {
    console.error('清除过期缓存失败:', err);
    return 0;
  }
}

/**
 * 清除最旧的缓存（用于超出大小限制时）
 * @returns {Promise<void>}
 */
async function clearOldestCache() {
  try {
    const metadata = await getCacheMetadata();
    
    if (metadata.totalSize <= CACHE_CONFIG.maxSize) {
      return;
    }
    
    // 按创建时间排序
    metadata.items.sort((a, b) => a.createTime - b.createTime);
    
    // 删除最旧的缓存，直到大小符合要求
    while (metadata.totalSize > CACHE_CONFIG.maxSize && metadata.items.length > 0) {
      const item = metadata.items.shift();
      await removeStorage(item.key);
      metadata.totalSize -= item.size;
    }
    
    await updateCacheMetadata(metadata);
  } catch (err) {
    console.error('清除最旧缓存失败:', err);
  }
}

/**
 * 获取缓存信息
 * @returns {Promise<Object>}
 */
export async function getCacheInfo() {
  try {
    const metadata = await getCacheMetadata();
    const storageInfo = await getStorageInfo();
    
    return {
      itemCount: metadata.items.length,
      totalSize: metadata.totalSize,
      maxSize: CACHE_CONFIG.maxSize,
      usage: (metadata.totalSize / CACHE_CONFIG.maxSize * 100).toFixed(2) + '%',
      storageLimit: storageInfo.limit,
      storageKeys: storageInfo.keys,
    };
  } catch (err) {
    console.error('获取缓存信息失败:', err);
    return {
      itemCount: 0,
      totalSize: 0,
      maxSize: CACHE_CONFIG.maxSize,
      usage: '0%',
    };
  }
}

/**
 * 图片缓存相关函数
 */

/**
 * 缓存图片URL
 * @param {string} url 图片URL
 * @param {string} localPath 本地路径
 * @param {number} expireTime 过期时间
 * @returns {Promise<void>}
 */
export async function cacheImage(url, localPath, expireTime = CACHE_CONFIG.defaultExpire) {
  const key = `${CACHE_CONFIG.imageCachePrefix}${url}`;
  await setCache(key, {
    url,
    localPath,
  }, expireTime);
}

/**
 * 获取缓存的图片路径
 * @param {string} url 图片URL
 * @returns {Promise<string|null>}
 */
export async function getCachedImage(url) {
  const key = `${CACHE_CONFIG.imageCachePrefix}${url}`;
  const cache = await getCache(key);
  return cache ? cache.localPath : null;
}

/**
 * 检查图片是否已缓存
 * @param {string} url 图片URL
 * @returns {Promise<boolean>}
 */
export async function isImageCached(url) {
  const cached = await getCachedImage(url);
  return !!cached;
}

/**
 * 清除图片缓存
 * @returns {Promise<number>} 返回清除的图片数量
 */
export async function clearImageCache() {
  try {
    const metadata = await getCacheMetadata();
    let clearedCount = 0;
    
    const validItems = [];
    
    for (const item of metadata.items) {
      if (item.key.startsWith(CACHE_CONFIG.imageCachePrefix)) {
        await removeStorage(item.key);
        clearedCount++;
      } else {
        validItems.push(item);
      }
    }
    
    // 重新计算总大小
    metadata.totalSize = validItems.reduce((sum, item) => sum + item.size, 0);
    metadata.items = validItems;
    
    await updateCacheMetadata(metadata);
    
    return clearedCount;
  } catch (err) {
    console.error('清除图片缓存失败:', err);
    return 0;
  }
}

/**
 * 初始化缓存清理（应用启动时调用）
 */
export async function initCache() {
  // 清除过期缓存
  await clearExpiredCache();
  
  // 检查缓存大小
  const info = await getCacheInfo();
  if (info.totalSize > CACHE_CONFIG.maxSize) {
    await clearOldestCache();
  }
}
