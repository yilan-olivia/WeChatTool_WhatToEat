/**
 * 删除食谱云函数
 * 实现权限控制，仅作者可删除
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 云函数入口函数
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    const { recipeId } = event;

    if (!recipeId) {
      return {
        errCode: -1,
        errMsg: '参数错误：缺少recipeId',
        data: null,
      };
    }

    // 获取食谱信息
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.data) {
      return {
        errCode: -1,
        errMsg: '食谱不存在',
        data: null,
      };
    }

    const recipe = recipeDoc.data;

    // 权限校验：仅作者可删除
    if (recipe.authorOpenid !== openid) {
      return {
        errCode: -1,
        errMsg: '无权限删除，仅作者可删除',
        data: null,
      };
    }

    // 软删除
    await db.collection('recipes').doc(recipeId).update({
      data: {
        isDeleted: true,
        updateTime: db.serverDate(),
      },
    });

    return {
      errCode: 0,
      errMsg: 'success',
      data: {
        recipeId: recipeId,
      },
    };
  } catch (err) {
    console.error('删除失败:', err);
    return {
      errCode: -1,
      errMsg: err.message || '删除失败',
      data: null,
    };
  }
};
