/**
 * 食谱详情页
 */
import { showToast, showLoading, hideLoading, showModal } from '../../utils/util.js';
import { formatDate } from '../../utils/date.js';

const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    recipe: null, // 食谱详情
    isLiked: false, // 是否已点赞
    isCollected: false, // 是否已收藏
    isAuthor: false, // 是否是作者
    currentUserOpenid: null, // 当前用户openid
    recipeId: null, // 食谱ID，用于重试
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    const { id } = options;
    console.log('详情页onLoad，options:', options, 'id:', id);
    
    if (!id) {
      showToast('参数错误', 'none');
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 保存id到data中，用于重试
    this.setData({ recipeId: id });

    // 先获取当前用户openid，再加载详情（确保isAuthor判断正确）
    try {
      await this.getCurrentUserOpenid();
    } catch (err) {
      console.error('获取用户openid失败，继续加载:', err);
    }
    
    // 加载食谱详情
    this.loadRecipeDetail(id);
  },

  /**
   * 重试加载
   */
  retryLoad() {
    const id = this.data.recipeId;
    if (id) {
      this.loadRecipeDetail(id);
    } else {
      showToast('无法重试，缺少ID', 'none');
    }
  },

  /**
   * 获取当前用户openid
   * 这里使用 login 动作，确保即使用户文档不存在也会被创建，
   * 并且始终能拿到当前用户的 openid。
   */
  async getCurrentUserOpenid() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user-login',
        data: {
          action: 'login',
          userInfo: {},
        },
      });

      if (result.result && result.result.errCode === 0 && result.result.data) {
        const openid = result.result.data._id;
        this.setData({ currentUserOpenid: openid });
        return openid;
      }
    } catch (err) {
      console.error('获取用户openid失败:', err);
    }
    return null;
  },

  /**
   * 加载食谱详情
   */
  async loadRecipeDetail(id) {
    this.setData({ loading: true });

    try {
      console.log('开始加载食谱详情，ID:', id);
      const db = wx.cloud.database();
      const result = await db.collection('recipes').doc(id).get();

      console.log('数据库查询结果:', result);

      if (!result || !result.data) {
        console.error('食谱不存在，result:', result);
        showToast('食谱不存在', 'none');
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }

      const recipe = result.data;
      console.log('获取到食谱数据:', recipe);

      // 检查是否已删除
      if (recipe.isDeleted) {
        console.log('食谱已删除');
        showToast('食谱已删除', 'none');
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }
        
      // 检查是否是作者（兼容不同字段：authorOpenid / userId）
      const authorId = recipe.authorOpenid || recipe.userId || null;
      const currentOpenid = this.data.currentUserOpenid;
      
      console.log('作者判断 - authorId:', authorId, 'currentOpenid:', currentOpenid);
      
      const isAuthor = authorId && currentOpenid && authorId === currentOpenid;
      
      console.log('isAuthor 结果:', isAuthor);
      
      // 检查是否已点赞
      const likeUsers = recipe.likeUsers || [];
      const isLiked = currentOpenid ? likeUsers.includes(currentOpenid) : false;

      // 检查是否已收藏（异步操作，失败不影响显示）
      let isCollected = false;
      if (this.data.currentUserOpenid) {
        try {
          const userResult = await wx.cloud.callFunction({
            name: 'user-login',
            data: {
              action: 'get',
            },
          });
          if (userResult.result && userResult.result.errCode === 0) {
            const collectedRecipes = userResult.result.data.collectedRecipes || [];
            isCollected = collectedRecipes.includes(recipe._id);
          }
        } catch (err) {
          console.error('检查收藏状态失败:', err);
          // 收藏状态检查失败不影响页面显示
        }
      }

      // 格式化时间
      const createTime = this.formatTime(recipe.createTime);

      console.log('准备设置页面数据，recipe:', recipe);

      this.setData({
        recipe: {
          ...recipe,
          createTime,
        },
        isAuthor,
        isLiked,
        isCollected,
      });

      console.log('页面数据设置完成');
    } catch (err) {
      console.error('加载食谱详情失败，详细错误:', err);
      console.error('错误堆栈:', err.stack);
      console.error('错误消息:', err.message);
      console.error('错误代码:', err.errCode);
      
      // 显示更详细的错误信息
      const errMsg = err.errMsg || err.message || '未知错误';
      showToast(`加载失败: ${errMsg}`, 'none');
      
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 格式化时间
   */
  formatTime(time) {
    if (!time) return '';
    const date = new Date(time);
    return formatDate(date, 'YYYY-MM-DD HH:mm');
  },

  /**
   * 点赞
   */
  async onLike() {
    if (!this.data.recipe) return;

    if (this.data.isLiked) {
      showToast('已点赞，不能重复点赞', 'none');
      return;
    }

    try {
      showLoading('点赞中...');

      const result = await wx.cloud.callFunction({
        name: 'likeImprint',
        data: {
          recipeId: this.data.recipe._id,
        },
      });

      if (result.result && result.result.errCode === 0) {
        // 更新本地数据
        const recipe = { ...this.data.recipe };
        recipe.likeCount = (recipe.likeCount || 0) + 1;
        const likeUsers = recipe.likeUsers || [];
        likeUsers.push(this.data.currentUserOpenid);
        recipe.likeUsers = likeUsers;

        this.setData({
          recipe,
          isLiked: true,
        });

        showToast('点赞成功', 'success');
      } else {
        showToast(result.result?.errMsg || '点赞失败', 'none');
      }
    } catch (err) {
      console.error('点赞失败:', err);
      showToast('点赞失败，请重试', 'none');
    } finally {
      hideLoading();
    }
  },

  /**
   * 收藏
   */
  async onCollect() {
    if (!this.data.recipe) return;

    try {
      showLoading('收藏中...');

      // 调用云函数收藏食谱
      const result = await wx.cloud.callFunction({
        name: 'user-login',
        data: {
          action: 'collectRecipe',
          recipeId: this.data.recipe._id,
        },
      });

      if (result.result && result.result.errCode === 0) {
        const isCollected = result.result.data.isCollected;
        const recipe = { ...this.data.recipe };
        recipe.collectCount = (recipe.collectCount || 0) + (isCollected ? 1 : -1);

        this.setData({
          isCollected,
          recipe,
        });
        showToast(isCollected ? '收藏成功' : '取消收藏成功', 'success');
      } else {
        showToast(result.result?.errMsg || '操作失败', 'none');
      }
    } catch (err) {
      console.error('收藏失败:', err);
      showToast('操作失败，请重试', 'none');
    } finally {
      hideLoading();
    }
  },

  /**
   * 删除食谱
   */
  async onDelete() {
    if (!this.data.recipe || !this.data.isAuthor) return;

    const res = await showModal('确定要删除这条食谱吗？', '提示');
    if (!res.confirm) return;

    try {
      showLoading('删除中...');

      const result = await wx.cloud.callFunction({
        name: 'deleteImprint',
        data: {
          recipeId: this.data.recipe._id,
        },
      });

      if (result.result && result.result.errCode === 0) {
        showToast('删除成功', 'success');
        
        // 返回社区主页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        showToast(result.result?.errMsg || '删除失败', 'none');
      }
    } catch (err) {
      console.error('删除失败:', err);
      showToast('删除失败，请重试', 'none');
    } finally {
      hideLoading();
    }
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = this.data.recipe.images || [];
    wx.previewImage({
      urls: images,
      current: images[index] || images[0],
    });
  },
});
