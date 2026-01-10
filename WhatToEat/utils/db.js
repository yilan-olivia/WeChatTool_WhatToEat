/**
 * 数据库操作封装
 * 封装微信云开发数据库常用操作
 */

import { cloudEnvId, dbCollections } from '../config/env.js';

const db = wx.cloud.database({
  env: cloudEnvId,
});

// 导出db.command，方便在页面中使用
export const dbCommand = db.command;

/**
 * 获取数据库集合引用
 * @param {string} collectionName 集合名称
 * @returns {Object} 集合引用对象
 */
export const getCollection = (collectionName) => {
  return db.collection(collectionName);
};

/**
 * 添加数据
 * @param {string} collectionName 集合名称
 * @param {Object} data 要添加的数据
 * @returns {Promise<Object>} 返回添加结果
 */
export const addData = async (collectionName, data) => {
  try {
    const result = await db.collection(collectionName).add({
      data: {
        ...data,
        createTime: db.serverDate(), // 服务器时间
        updateTime: db.serverDate(),
      },
    });
    return result;
  } catch (err) {
    console.error('添加数据失败:', err);
    throw err;
  }
};

/**
 * 查询数据
 * @param {string} collectionName 集合名称
 * @param {Object} where 查询条件
 * @param {Object} options 查询选项（limit, skip, orderBy等）
 * @returns {Promise<Array>} 返回查询结果数组
 */
export const queryData = async (collectionName, where = {}, options = {}) => {
  try {
    let query = db.collection(collectionName).where(where);

    // 排序
    if (options.orderBy) {
      const { field, order } = options.orderBy;
      query = query.orderBy(field, order || 'desc');
    }

    // 分页
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.skip) {
      query = query.skip(options.skip);
    }

    const result = await query.get();
    return result.data;
  } catch (err) {
    console.error('查询数据失败:', err);
    throw err;
  }
};

/**
 * 更新数据
 * @param {string} collectionName 集合名称
 * @param {string} id 文档ID
 * @param {Object} data 要更新的数据
 * @returns {Promise<Object>} 返回更新结果
 */
export const updateData = async (collectionName, id, data) => {
  try {
    const result = await db.collection(collectionName).doc(id).update({
      data: {
        ...data,
        updateTime: db.serverDate(),
      },
    });
    return result;
  } catch (err) {
    console.error('更新数据失败:', err);
    throw err;
  }
};

/**
 * 删除数据
 * @param {string} collectionName 集合名称
 * @param {string} id 文档ID
 * @returns {Promise<Object>} 返回删除结果
 */
export const deleteData = async (collectionName, id) => {
  try {
    const result = await db.collection(collectionName).doc(id).remove();
    return result;
  } catch (err) {
    console.error('删除数据失败:', err);
    throw err;
  }
};

/**
 * 根据ID获取单条数据
 * @param {string} collectionName 集合名称
 * @param {string} id 文档ID
 * @returns {Promise<Object>} 返回数据对象
 */
export const getDataById = async (collectionName, id) => {
  try {
    const result = await db.collection(collectionName).doc(id).get();
    return result.data;
  } catch (err) {
    console.error('获取数据失败:', err);
    throw err;
  }
};

/**
 * 统计数量
 * @param {string} collectionName 集合名称
 * @param {Object} where 查询条件
 * @returns {Promise<number>} 返回数量
 */
export const countData = async (collectionName, where = {}) => {
  try {
    const result = await db.collection(collectionName).where(where).count();
    return result.total;
  } catch (err) {
    console.error('统计数量失败:', err);
    throw err;
  }
};

// 导出集合名称常量，方便使用
export { dbCollections };
