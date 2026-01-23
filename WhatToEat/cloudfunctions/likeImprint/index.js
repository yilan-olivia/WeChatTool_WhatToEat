/**
 * 点赞食谱云函数
 * 实现防重复点赞逻辑
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

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
    const likeUsers = recipe.likeUsers || [];

    // 检查是否已点赞
    if (likeUsers.includes(openid)) {
      return {
        errCode: -1,
        errMsg: '已点赞，不能重复点赞',
        data: null,
      };
    }

    // 更新点赞数和点赞用户列表
    await db.collection('recipes').doc(recipeId).update({
      data: {
        likeCount: _.inc(1),
        likeUsers: _.push([openid]),
        updateTime: db.serverDate(),
      },
    });

    // 获取更新后的数据
    const updatedDoc = await db.collection('recipes').doc(recipeId).get();

    return {
      errCode: 0,
      errMsg: 'success',
      data: {
        likeCount: updatedDoc.data.likeCount,
        likeUsers: updatedDoc.data.likeUsers,
      },
    };
  } catch (err) {
    console.error('点赞失败:', err);
    return {
      errCode: -1,
      errMsg: err.message || '点赞失败',
      data: null,
    };
  }
};
