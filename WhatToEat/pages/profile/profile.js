/**
 * 个人中心页
 */
import { getUserProfile } from '../../utils/auth.js';
import { showToast, showModal, showLoading, hideLoading } from '../../utils/util.js';
import { setStorage, getStorage, STORAGE_KEYS } from '../../utils/storage.js';

const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    userInfo: {}, // 用户信息
    isLogin: false, // 登录状态
    showNicknameModal: false, // 是否显示昵称编辑弹窗
    nicknameInput: '', // 昵称输入框的值
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadUserInfo();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 刷新用户信息
    this.loadUserInfo();
  },

  /**
   * 加载用户信息（从云数据库）
   */
  async loadUserInfo() {
    try {
      // 先检查本地存储
      const localUserInfo = await getStorage(STORAGE_KEYS.USER_INFO);
      if (localUserInfo) {
        this.setData({
          userInfo: localUserInfo,
          isLogin: true,
        });
        app.globalData.userInfo = localUserInfo;
        app.globalData.isLogin = true;
      }

      // 从云数据库获取最新用户信息
      const result = await wx.cloud.callFunction({
        name: 'user-login',
        data: {
          action: 'get',
        },
      });

      if (result.result && result.result.errCode === 0) {
        const userInfo = result.result.data;
        this.setData({
          userInfo,
          isLogin: true,
        });
        // 更新全局数据和本地存储
        app.setUserInfo(userInfo);
        await setStorage(STORAGE_KEYS.USER_INFO, userInfo);
      } else if (!localUserInfo) {
        // 如果云数据库也没有，且本地也没有，则未登录
        this.setData({
          userInfo: {},
          isLogin: false,
        });
      }
    } catch (err) {
      console.error('加载用户信息失败:', err);
      // 如果云函数调用失败，使用本地存储的数据
      const localUserInfo = await getStorage(STORAGE_KEYS.USER_INFO);
      if (localUserInfo) {
        this.setData({
          userInfo: localUserInfo,
          isLogin: true,
        });
      } else {
        this.setData({
          userInfo: {},
          isLogin: false,
        });
      }
    }
  },


  /**
   * 用户信息点击
   */
  onUserInfoTap() {
    if (!this.data.isLogin) {
      // 未登录时，显示登录选项
      wx.showActionSheet({
        itemList: ['从图库中选择'],
        success: (res) => {
          switch (res.tapIndex) {
            case 0:
              // 从图库中选择
              this.chooseImageFromGallery();
              break;
          }
        },
        fail: (err) => {
          console.error('选择失败:', err);
        }
      });
    } else {
      // 已登录时，显示编辑选项
      wx.showActionSheet({
        itemList: ['从图库中选择', '更换昵称'],
        success: (res) => {
          switch (res.tapIndex) {
            case 0:
              // 从图库中选择
              this.chooseImageFromGallery();
              break;
            case 1:
              // 更换昵称
              this.changeNickname();
              break;
          }
        },
        fail: (err) => {
          console.error('选择失败:', err);
        }
      });
    }
  },

  /**
   * 从图库中选择图片
   */
  chooseImageFromGallery() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        // 上传图片到云存储
        this.uploadAvatarToCloud(tempFilePath);
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          showToast('选择图片失败，请重试', 'none');
        }
      }
    });
  },


  /**
   * 上传头像到云存储
   */
  async uploadAvatarToCloud(tempFilePath) {
    try {
      showLoading('上传头像中...');

      // 生成云存储路径
      const cloudPath = `user-avatars/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      
      // 上传到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath,
      });

      const fileID = uploadResult.fileID;

      // 获取当前用户信息（如果已登录）或创建新用户
      const currentNickName = this.data.userInfo.nickName || '微信用户';
      
      // 保存用户信息到云数据库
      const result = await wx.cloud.callFunction({
        name: 'user-login',
        data: {
          action: this.data.isLogin ? 'update' : 'login',
          userInfo: {
            nickName: currentNickName,
            avatarUrl: fileID,
          },
        },
      });

      if (result.result && result.result.errCode === 0) {
        const userInfo = result.result.data;
        
        // 更新本地数据
        this.setData({
          userInfo,
          isLogin: true,
        });
        
        // 更新全局数据和本地存储
        app.setUserInfo(userInfo);
        await setStorage(STORAGE_KEYS.USER_INFO, userInfo);

        hideLoading();
        showToast('头像上传成功', 'success');
      } else {
        throw new Error(result.result?.errMsg || '保存失败');
      }
    } catch (err) {
      hideLoading();
      console.error('上传头像失败:', err);
      showToast('上传头像失败，请重试', 'none');
    }
  },

  /**
   * 更换昵称
   */
  changeNickname() {
    // 显示自定义昵称编辑弹窗，输入框初始为空，显示placeholder
    this.setData({
      showNicknameModal: true,
      nicknameInput: '', // 初始为空，让placeholder显示
    });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止事件冒泡，防止关闭弹窗
  },

  /**
   * 昵称输入
   */
  onNicknameInput(e) {
    const value = e.detail.value;
    this.setData({
      nicknameInput: value,
    });
  },


  /**
   * 关闭昵称编辑弹窗
   */
  closeNicknameModal() {
    this.setData({
      showNicknameModal: false,
      nicknameInput: '',
    });
  },

  /**
   * 确认保存昵称
   */
  async confirmNickname() {
    const newNickname = this.data.nicknameInput.trim();
    
    if (!newNickname) {
      showToast('昵称不能为空', 'none');
      return;
    }

    if (newNickname.length > 20) {
      showToast('昵称不能超过20个字符', 'none');
      return;
    }

    // 如果昵称没有变化，直接关闭
    if (newNickname === this.data.userInfo.nickName) {
      this.closeNicknameModal();
      return;
    }

    try {
      showLoading('更新昵称中...');

      // 保存昵称到云数据库
      const result = await wx.cloud.callFunction({
        name: 'user-login',
        data: {
          action: 'update',
          userInfo: {
            nickName: newNickname,
            avatarUrl: this.data.userInfo.avatarUrl || '',
          },
        },
      });

      if (result.result && result.result.errCode === 0) {
        const userInfo = result.result.data;
        
        // 更新本地数据
        this.setData({
          userInfo,
          isLogin: true,
        });
        
        // 更新全局数据和本地存储
        app.setUserInfo(userInfo);
        await setStorage(STORAGE_KEYS.USER_INFO, userInfo);

        hideLoading();
        showToast('昵称更新成功', 'success');
        
        // 关闭弹窗
        this.closeNicknameModal();
      } else {
        throw new Error(result.result?.errMsg || '更新失败');
      }
    } catch (err) {
      hideLoading();
      console.error('更新昵称失败:', err);
      showToast('更新昵称失败，请重试', 'none');
    }
  },

  /**
   * 导航到健康报告
   */
  navigateToReport() {
    wx.navigateTo({
      url: '/pages/report/report',
    });
  },

  /**
   * 导航到食谱收藏页
   */
  navigateToCollectedRecipes() {
    wx.navigateTo({
      url: '/pages/community/collected',
    });
  },

  /**
   * 设置点击
   */
  onSettingsTap() {
    wx.navigateTo({
      url: '/pages/settings/settings',
    });
  },

  /**
   * 关于我们点击
   */
  onAboutTap() {
    wx.showModal({
      title: '关于我们',
      content: '家庭菜品管理与智能食谱\n\n一款帮助您管理家庭菜品、生成智能食谱的小程序。\n\n版本：1.0.0',
      showCancel: false,
    });
  },

  /**
   * 退出登录
   */
  async onLogout() {
    const confirm = await showModal('确定要退出登录吗？', '提示');
    if (confirm) {
      app.clearUserInfo();
      this.setData({
        userInfo: {},
        isLogin: false,
      });
      showToast('已退出登录', 'success');
    }
  },
});

