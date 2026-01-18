/**
 * 云函数缓存工具
 * 用于缓存识别结果、推荐结果等
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 获取缓存
 * @param {string} collection 集合名称
 * @param {string} key 缓存key
 * @returns {Promise<Object|null>}
 */
async function getCache(collection, key) {
  try {
    const result = await db.collection(collection)
      .where({ key })
      .get();

    if (result.data.length === 0) {
      return null;
    }

    const cacheItem = result.data[0];
    
    // 检查是否过期
    if (cacheItem.expireTime && new Date(cacheItem.expireTime) < new Date()) {
      // 已过期，删除缓存
      await db.collection(collection).doc(cacheItem._id).remove();
      return null;
    }

    return cacheItem.value;
  } catch (err) {
    console.error('获取缓存失败:', err);
    return null;
  }
}

/**
 * 设置缓存
 * @param {string} collection 集合名称
 * @param {string} key 缓存key
 * @param {any} value 缓存值
 * @param {number} expireTime 过期时间（毫秒），0表示不过期
 * @returns {Promise<void>}
 */
async function setCache(collection, key, value, expireTime = 0) {
  try {
    const now = new Date();
    const expireDate = expireTime > 0 ? new Date(now.getTime() + expireTime) : null;

    // 先查询是否存在
    const existing = await db.collection(collection)
      .where({ key })
      .get();

    const cacheData = {
      key,
      value,
      createTime: now,
      expireTime: expireDate,
      updateTime: now,
    };

    if (existing.data.length > 0) {
      // 更新现有缓存
      await db.collection(collection)
        .doc(existing.data[0]._id)
        .update({ data: cacheData });
    } else {
      // 创建新缓存
      await db.collection(collection).add({ data: cacheData });
    }
  } catch (err) {
    console.error('设置缓存失败:', err);
    throw err;
  }
}

/**
 * 删除缓存
 * @param {string} collection 集合名称
 * @param {string} key 缓存key
 * @returns {Promise<void>}
 */
async function removeCache(collection, key) {
  try {
    await db.collection(collection)
      .where({ key })
      .remove();
  } catch (err) {
    console.error('删除缓存失败:', err);
  }
}

/**
 * 清理过期缓存
 * @param {string} collection 集合名称
 * @returns {Promise<number>} 清理的数量
 */
async function clearExpiredCache(collection) {
  try {
    const now = new Date();
    const result = await db.collection(collection)
      .where({
        expireTime: db.command.lt(now),
      })
      .remove();

    return result.stats.removed;
  } catch (err) {
    console.error('清理过期缓存失败:', err);
    return 0;
  }
}

module.exports = {
  getCache,
  setCache,
  removeCache,
  clearExpiredCache,
};
