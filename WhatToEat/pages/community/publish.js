/**
 * 发布食谱页
 */
import { showToast, showLoading, hideLoading } from '../../utils/util.js';

const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    loadingText: '加载中...',
    title: '', // 标题
    content: '', // 内容
    images: [], // 图片列表
    maxImages: 9, // 最大图片数量
    uploading: false, // 是否正在上传
    typeCategory: '', // 类型分类：'dietType' 或 'favoriteCategory'
    typeValue: '', // 类型值
    dietTypes: [
      { value: 'balanced', label: '均衡饮食' },
      { value: 'vegetarian', label: '素食' },
      { value: 'low_carb', label: '低碳水' },
      { value: 'high_protein', label: '高蛋白' },
    ],
    foodCategories: [
      '蔬菜', '水果', '肉类', '海鲜', '谷物', '乳制品', '豆制品', '其他'
    ],
    dietTypeIndex: 0,
    favoriteCategoryIndex: 0,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 加载用户设置，获取默认类型
    this.loadUserSettings();
  },

  /**
   * 加载用户设置
   */
  async loadUserSettings() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user-login',
        data: {
          action: 'get',
        },
      });

      if (result.result && result.result.errCode === 0) {
        const userInfo = result.result.data;
        if (userInfo && userInfo.settings) {
          const settings = userInfo.settings;
          // 设置默认类型
          const dietType = settings.preferences?.dietType || 'balanced';
          const favoriteCategory = settings.preferences?.favoriteCategory || '蔬菜';
          
          const dietTypeIndex = this.data.dietTypes.findIndex(item => item.value === dietType);
          const favoriteCategoryIndex = this.data.foodCategories.indexOf(favoriteCategory);
          
          // 设置默认类型值（优先使用饮食类型）
          this.setData({
            dietTypeIndex: dietTypeIndex >= 0 ? dietTypeIndex : 0,
            favoriteCategoryIndex: favoriteCategoryIndex >= 0 ? favoriteCategoryIndex : 0,
            typeCategory: 'dietType',
            typeValue: dietType,
          });
        } else {
          // 如果没有用户设置，使用默认值
          this.setData({
            dietTypeIndex: 0,
            favoriteCategoryIndex: 0,
            typeCategory: 'dietType',
            typeValue: 'balanced',
          });
        }
      } else {
        // 如果获取用户信息失败，使用默认值
        this.setData({
          dietTypeIndex: 0,
          favoriteCategoryIndex: 0,
          typeCategory: 'dietType',
          typeValue: 'balanced',
        });
      }
    } catch (err) {
      console.error('加载用户设置失败:', err);
    }
  },

  /**
   * 输入标题
   */
  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  /**
   * 输入内容
   */
  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  /**
   * 选择类型分类
   */
  onTypeCategoryChange(e) {
    this.setData({
      typeCategory: e.detail.value,
      typeValue: '', // 重置类型值
    });
  },

  /**
   * 选择饮食类型
   */
  onDietTypeChange(e) {
    const index = parseInt(e.detail.value);
    const dietType = this.data.dietTypes[index];
    if (dietType) {
      this.setData({
        dietTypeIndex: index,
        typeCategory: 'dietType',
        typeValue: dietType.value,
      });
    }
  },

  /**
   * 选择喜爱分类
   */
  onFavoriteCategoryChange(e) {
    const index = parseInt(e.detail.value);
    const category = this.data.foodCategories[index];
    if (category) {
      this.setData({
        favoriteCategoryIndex: index,
        typeCategory: 'favoriteCategory',
        typeValue: category,
      });
    }
  },

  /**
   * 选择图片
   */
  chooseImage() {
    const remainCount = this.data.maxImages - this.data.images.length;
    if (remainCount <= 0) {
      showToast('最多只能上传9张图片', 'none');
      return;
    }

    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        this.setData({ uploading: true });
        showLoading('上传图片中...');

        try {
          const newImages = [];
          
          // 上传图片到云存储
          for (const tempFilePath of res.tempFilePaths) {
            const cloudPath = `community-images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
            const uploadResult = await wx.cloud.uploadFile({
              cloudPath,
              filePath: tempFilePath,
            });
            newImages.push(uploadResult.fileID);
          }

          this.setData({
            images: [...this.data.images, ...newImages],
          });
        } catch (err) {
          console.error('上传图片失败:', err);
          showToast('上传失败，请重试', 'none');
        } finally {
          hideLoading();
          this.setData({ uploading: false });
        }
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        if (!err.errMsg || !err.errMsg.includes('cancel')) {
          showToast('选择图片失败', 'none');
        }
        this.setData({ uploading: false });
      },
    });
  },

  /**
   * 移除图片
   */
  removeImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images });
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({
      urls,
      current,
    });
  },

  /**
   * 发布食谱
   */
  async publishPost() {
    // 表单校验
    const title = this.data.title.trim();
    const content = this.data.content.trim();
    const images = this.data.images;
    const typeCategory = this.data.typeCategory;
    const typeValue = this.data.typeValue;

    // 校验标题
    if (!title) {
      showToast('请输入标题', 'none');
      return;
    }
    if (title.length < 1 || title.length > 20) {
      showToast('标题长度为1-20字', 'none');
      return;
    }

    // 校验内容
    if (!content) {
      showToast('请输入内容', 'none');
      return;
    }
    if (content.length < 10 || content.length > 200) {
      showToast('内容长度为10-200字', 'none');
      return;
    }

    // 校验类型
    if (!typeCategory || !typeValue) {
      showToast('请选择类型', 'none');
      return;
    }

    // 校验图片
    if (images.length === 0) {
      showToast('请至少上传1张图片', 'none');
      return;
    }

    this.setData({ 
      loading: true,
      loadingText: '发布中...',
    });

    try {
      // 获取用户openid
      let authorOpenid = null;
      try {
        const userResult = await wx.cloud.callFunction({
          name: 'user-login',
          data: {
            action: 'get',
          },
        });
        if (userResult.result && userResult.result.errCode === 0) {
          authorOpenid = userResult.result.data._id;
        }
      } catch (err) {
        console.error('获取用户信息失败:', err);
      }

      // 调用云函数发布食谱
      // 注意：云函数中已经修改为支持 recipeData 参数
      const result = await wx.cloud.callFunction({
        name: 'community',
        data: {
          action: 'publishRecipe',
          data: {
            title: title,
            content: content,
            images: images,
            typeCategory: typeCategory,
            typeValue: typeValue,
            authorOpenid: authorOpenid,
          },
        },
      });

      if (result.result && result.result.errCode === 0) {
        showToast('发布成功', 'success');
        
        // 延迟返回社区主页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        showToast(result.result?.errMsg || '发布失败', 'none');
      }
    } catch (err) {
      console.error('发布失败:', err);
      showToast('发布失败，请重试', 'none');
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 取消发布
   */
  cancelPublish() {
    wx.navigateBack();
  },
});
