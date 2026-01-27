/**
 * 拍照识别页
 */
import { cloudEnvId } from '../../config/env.js';
import { addData, dbCollections } from '../../utils/db.js';
import { showToast, showLoading, hideLoading } from '../../utils/util.js';
import { formatDate } from '../../utils/date.js';
import { callCloudFunction } from '../../utils/request.js';
import { cloudFunctions } from '../../config/api.js';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    loadingText: '加载中...',
    imagePath: '', // 图片路径
    takingPhoto: false, // 是否正在拍照
    recognizing: false, // 是否正在识别
    recognitionResult: null, // 识别结果
    expireDate: '', // 保质期
    remark: '', // 备注
    minDate: formatDate(new Date(), 'YYYY-MM-DD'), // 最小日期（今天）
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查相机权限
    this.checkCameraPermission();
  },

  /**
   * 检查相机权限
   */
  checkCameraPermission() {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.camera']) {
          wx.authorize({
            scope: 'scope.camera',
            success: () => {
              console.log('相机权限授权成功');
            },
            fail: () => {
              showToast('需要相机权限才能拍照', 'none');
              // 引导用户打开权限设置
              setTimeout(() => {
                wx.openSetting({
                  success: (res) => {
                    if (res.authSetting['scope.camera']) {
                      console.log('用户在设置中开启了相机权限');
                    }
                  }
                });
              }, 1000);
            }
          });
        }
      }
    });
  },

  /**
   * 选择图片
   */
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({
          imagePath: tempFilePath,
          recognitionResult: null, // 清除之前的识别结果
        });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        showToast('选择图片失败', 'none');
      },
    });
  },

  /**
   * 拍照（使用camera组件）
   */
  takePhotoWithCamera() {
    this.setData({ takingPhoto: true });
    
    const ctx = wx.createCameraContext();
    ctx.takePhoto({
      quality: 'high',
      success: (res) => {
        const tempFilePath = res.tempImagePath;
        this.setData({
          imagePath: tempFilePath,
          recognitionResult: null,
        });
        showToast('拍照成功', 'success');
      },
      fail: (err) => {
        console.error('拍照失败:', err);
        showToast('拍照失败，请重试', 'none');
      },
      complete: () => {
        this.setData({ takingPhoto: false });
      },
    });
  },

  /**
   * 相机错误处理
   */
  onCameraError(e) {
    console.error('相机错误:', e.detail);
    showToast('相机初始化失败，请检查相机权限', 'none');
  },

  /**
   * 移除图片
   */
  removeImage() {
    this.setData({
      imagePath: '',
      recognitionResult: null,
      expireDate: '',
      remark: '',
    });
  },

  /**
   * 识别图片
   */
  async recognizeImage() {
    if (!this.data.imagePath) {
      showToast('请先选择图片', 'none');
      return;
    }

    this.setData({ 
      recognizing: true,
      loading: true,
      loadingText: '识别中...',
    });

    try {
      // 上传图片到云存储
      const cloudPath = `food-images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath: this.data.imagePath,
      });

      // 调用云函数进行图片识别
      const result = await callCloudFunction('food-recognition', {
        fileID: uploadResult.fileID,
      });

      this.setData({
        recognitionResult: result,
      });
      showToast('识别失败，使用默认结果', 'none');
    } finally {
      this.setData({ 
        recognizing: false,
        loading: false,
      });
    }
  },

  /**
   * 日期选择
   */
  onDateChange(e) {
    this.setData({
      expireDate: e.detail.value,
    });
  },

  /**
   * 备注输入
   */
  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value,
    });
  },

  /**
   * 保存菜品
   */
  async saveFood() {
    if (!this.data.recognitionResult) {
      showToast('请先识别图片', 'none');
      return;
    }

    if (!this.data.expireDate) {
      showToast('请选择保质期', 'none');
      return;
    }

    this.setData({ 
      loading: true,
      loadingText: '保存中...',
    });

    try {
      // 上传图片到云存储（如果还没有上传）
      let imageUrl = this.data.imagePath;
      if (!imageUrl.startsWith('cloud://')) {
        const cloudPath = `food-images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath,
          filePath: this.data.imagePath,
        });
        imageUrl = uploadResult.fileID;
      }

      // 计算状态（根据保质期）
      const expireDate = new Date(this.data.expireDate);
      const now = new Date();
      const daysDiff = Math.floor((expireDate - now) / (1000 * 60 * 60 * 24));
      
      let status = 'fresh';
      if (daysDiff < 0) {
        status = 'expired';
      } else if (daysDiff <= 3) {
        status = 'warning';
      }

      // 保存到数据库
      await addData(dbCollections.foods, {
        name: this.data.recognitionResult.name,
        category: this.data.recognitionResult.category || '其他',
        image: imageUrl,
        expireDate: this.data.expireDate,
        remark: this.data.remark,
        status,
      });

      showToast('保存成功', 'success');

      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      console.error('保存失败:', err);
      showToast('保存失败，请重试', 'none');
    } finally {
      this.setData({ loading: false });
    }
  },
});

