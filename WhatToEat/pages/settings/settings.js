/**
 * 设置页面
 */
import { getUserInfo, updateUserInfo } from '../../utils/auth.js';
import { showToast, showModal, showLoading, hideLoading } from '../../utils/util.js';
import { subscribeMessageTemplates } from '../../config/env.js';

const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    userInfo: {},
    settings: {
      notifications: {
        expireReminder: '3days', // 'none' | '3days' | '1day'
        recipeRecommend: true,
        communityUpdate: false,
      },
      privacy: {
        showProfile: true,
        showStatistics: false,
      },
      preferences: {
        dietType: 'balanced',
        favoriteCategory: '蔬菜',
      },
    },
    expireReminderOptions: [
      { value: 'none', label: '不提醒' },
      { value: '3days', label: '菜品过期前三天提醒' },
      { value: '1day', label: '食品过期前一天提醒' },
    ],
    expireReminderIndex: 1, // 当前选择的过期提醒索引，默认3days
    dietTypeIndex: 0, // 当前选择的饮食类型索引
    favoriteCategoryIndex: 0, // 当前选择的喜爱分类索引
    dietTypes: [
      { value: 'balanced', label: '均衡饮食' },
      { value: 'vegetarian', label: '素食' },
      { value: 'low_carb', label: '低碳水' },
      { value: 'high_protein', label: '高蛋白' },
    ],
    foodCategories: [
      '蔬菜', '水果', '肉类', '海鲜', '谷物', '乳制品', '豆制品', '其他'
    ],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadSettings();
  },

  /**
   * 加载设置
   */
  async loadSettings() {
    try {
      this.setData({ loading: true });
      
      // 从云数据库获取最新用户信息
      try {
        const result = await wx.cloud.callFunction({
          name: 'user-login',
          data: {
            action: 'get',
          },
        });

        if (result.result && result.result.errCode === 0) {
          const userInfo = result.result.data;
          app.globalData.userInfo = userInfo;
          
          if (userInfo.settings) {
            // 合并设置，确保所有字段都存在
            const mergedSettings = {
              notifications: {
                expireReminder: userInfo.settings.notifications?.expireReminder || '3days',
                recipeRecommend: userInfo.settings.notifications?.recipeRecommend !== undefined 
                  ? userInfo.settings.notifications.recipeRecommend 
                  : true,
                communityUpdate: userInfo.settings.notifications?.communityUpdate || false,
              },
              privacy: {
                showProfile: userInfo.settings.privacy?.showProfile !== undefined 
                  ? userInfo.settings.privacy.showProfile 
                  : true,
                showStatistics: userInfo.settings.privacy?.showStatistics || false,
              },
              preferences: {
                dietType: userInfo.settings.preferences?.dietType || 'balanced',
                favoriteCategory: userInfo.settings.preferences?.favoriteCategory || '蔬菜',
              },
            };
            
            // 计算过期提醒的索引
            const expireReminderIndex = this.data.expireReminderOptions.findIndex(
              item => item.value === mergedSettings.notifications.expireReminder
            );
            // 计算饮食类型的索引
            const dietTypeIndex = this.data.dietTypes.findIndex(
              item => item.value === mergedSettings.preferences.dietType
            );
            // 计算喜爱分类的索引
            const favoriteCategoryIndex = this.data.foodCategories.indexOf(
              mergedSettings.preferences.favoriteCategory
            );
            
            this.setData({
              userInfo,
              settings: mergedSettings,
              expireReminderIndex: expireReminderIndex >= 0 ? expireReminderIndex : 1,
              dietTypeIndex: dietTypeIndex >= 0 ? dietTypeIndex : 0,
              favoriteCategoryIndex: favoriteCategoryIndex >= 0 ? favoriteCategoryIndex : 0,
            });
          } else {
            this.setData({ userInfo });
          }
        } else {
          // 使用本地存储的数据
          const userInfo = app.globalData.userInfo;
          if (userInfo && userInfo.settings) {
            const mergedSettings = { ...this.data.settings, ...userInfo.settings };
            // 计算过期提醒的索引
            const expireReminderIndex = this.data.expireReminderOptions.findIndex(
              item => item.value === (mergedSettings.notifications?.expireReminder || '3days')
            );
            // 计算饮食类型的索引
            const dietTypeIndex = this.data.dietTypes.findIndex(
              item => item.value === (mergedSettings.preferences?.dietType || 'balanced')
            );
            // 计算喜爱分类的索引
            const favoriteCategoryIndex = this.data.foodCategories.indexOf(
              mergedSettings.preferences?.favoriteCategory || '蔬菜'
            );
            this.setData({
              userInfo,
              settings: mergedSettings,
              expireReminderIndex: expireReminderIndex >= 0 ? expireReminderIndex : 1,
              dietTypeIndex: dietTypeIndex >= 0 ? dietTypeIndex : 0,
              favoriteCategoryIndex: favoriteCategoryIndex >= 0 ? favoriteCategoryIndex : 0,
            });
          } else {
            this.setData({ 
              userInfo: userInfo || {},
            });
          }
        }
      } catch (err) {
        console.error('从云端加载设置失败:', err);
        // 使用本地存储的数据
        const userInfo = app.globalData.userInfo;
        if (userInfo && userInfo.settings) {
          const mergedSettings = { ...this.data.settings, ...userInfo.settings };
          this.setData({
            userInfo,
            settings: mergedSettings,
          });
        } else {
          this.setData({ 
            userInfo: userInfo || {},
            expireReminderIndex: 1,
            dietTypeIndex: 0,
            favoriteCategoryIndex: 0,
          });
        }
      }
    } catch (err) {
      console.error('加载设置失败:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 过期提醒变更
   */
  async onExpireReminderChange(e) {
    const index = e.detail.value;
    const selectedOption = this.data.expireReminderOptions[index];
    const newSettings = { ...this.data.settings };
    newSettings.notifications.expireReminder = selectedOption.value;
    
    // 如果选择了提醒，需要请求订阅消息权限
    if (selectedOption.value !== 'none') {
      try {
        // 获取订阅消息模板ID
        const templateId = subscribeMessageTemplates.expireReminder;
        
        if (!templateId) {
          // 如果模板ID未配置，提示用户
          showToast('提醒功能需要配置模板ID', 'none');
          // 恢复为不提醒
          newSettings.notifications.expireReminder = 'none';
          this.setData({
            settings: newSettings,
            expireReminderIndex: 0,
          });
          return;
        }

        // 请求订阅消息权限
        const result = await new Promise((resolve, reject) => {
          wx.requestSubscribeMessage({
            tmplIds: [templateId],
            success: resolve,
            fail: reject,
          });
        });

        console.log('订阅消息授权结果:', result);
        
        // result[模板ID] 的值：'accept' 表示用户同意，'reject' 表示用户拒绝，'ban' 表示已被后台封禁
        if (result[templateId] === 'reject') {
          showToast('需要授权才能接收提醒', 'none');
          // 如果用户拒绝，恢复为不提醒
          newSettings.notifications.expireReminder = 'none';
          this.setData({
            settings: newSettings,
            expireReminderIndex: 0,
          });
          return;
        } else if (result[templateId] === 'ban') {
          showToast('提醒功能已被禁用', 'none');
          newSettings.notifications.expireReminder = 'none';
          this.setData({
            settings: newSettings,
            expireReminderIndex: 0,
          });
          return;
        }
        
        // 用户同意，显示成功提示
        if (result[templateId] === 'accept') {
          showToast('提醒权限已开启', 'success');
        }
      } catch (err) {
        console.error('订阅消息错误:', err);
        // 如果出错，仍然保存设置，但提示用户
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          showToast('设置已保存，但需要授权才能接收提醒', 'none');
        }
      }
    }
    
    // 保存设置到云端
    this.setData({ 
      settings: newSettings,
      expireReminderIndex: index,
    });
    
    // 立即保存设置（不等待用户点击保存按钮）
    this.saveSettingsSilently(newSettings);
  },

  /**
   * 静默保存设置（不显示提示）
   */
  async saveSettingsSilently(settings) {
    try {
      const userInfo = app.globalData.userInfo;
      if (!userInfo) return;

      await wx.cloud.callFunction({
        name: 'user-login',
        data: {
          action: 'updateSettings',
          settings: settings,
        },
      });
    } catch (err) {
      console.error('静默保存设置失败:', err);
    }
  },

  /**
   * 通知设置变更 - 食谱推荐
   */
  onRecipeRecommendChange(e) {
    const newSettings = { ...this.data.settings };
    newSettings.notifications.recipeRecommend = e.detail.value;
    this.setData({ settings: newSettings });
  },

  /**
   * 通知设置变更 - 社区更新
   */
  onCommunityUpdateChange(e) {
    const newSettings = { ...this.data.settings };
    newSettings.notifications.communityUpdate = e.detail.value;
    this.setData({ settings: newSettings });
  },

  /**
   * 隐私设置变更 - 显示个人资料
   */
  onShowProfileChange(e) {
    const newSettings = { ...this.data.settings };
    newSettings.privacy.showProfile = e.detail.value;
    this.setData({ settings: newSettings });
  },

  /**
   * 隐私设置变更 - 显示统计数据
   */
  onShowStatisticsChange(e) {
    const newSettings = { ...this.data.settings };
    newSettings.privacy.showStatistics = e.detail.value;
    this.setData({ settings: newSettings });
  },

  /**
   * 饮食类型变更
   */
  onDietTypeChange(e) {
    const index = e.detail.value;
    const selectedOption = this.data.dietTypes[index];
    const newSettings = { ...this.data.settings };
    newSettings.preferences.dietType = selectedOption.value;
    this.setData({ 
      settings: newSettings,
      dietTypeIndex: index,
    });
  },

  /**
   * 喜爱分类变更
   */
  onFavoriteCategoryChange(e) {
    const index = e.detail.value;
    const selectedCategory = this.data.foodCategories[index];
    const newSettings = { ...this.data.settings };
    newSettings.preferences.favoriteCategory = selectedCategory;
    this.setData({ 
      settings: newSettings,
      favoriteCategoryIndex: index,
    });
  },

  /**
   * 保存设置
   */
  async saveSettings() {
    try {
      this.setData({ loading: true });
      
      const userInfo = app.globalData.userInfo;
      if (!userInfo) {
        showToast('请先登录', 'none');
        return;
      }

      // 更新用户设置到云数据库
      const result = await wx.cloud.callFunction({
        name: 'user-login',
        data: {
          action: 'updateSettings',
          settings: this.data.settings,
        },
      });

      if (result.result && result.result.errCode === 0) {
        const updatedUserInfo = result.result.data;
        
        // 更新本地数据
        app.setUserInfo(updatedUserInfo);
        this.setData({ userInfo: updatedUserInfo });

        showToast('保存成功', 'success');
        
        // 延迟返回
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      } else {
        throw new Error(result.result?.errMsg || '保存失败');
      }
    } catch (err) {
      console.error('保存设置失败:', err);
      showToast('保存失败，请重试', 'none');
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 测试提醒功能
   */
  async testReminder() {
    const templateId = subscribeMessageTemplates.expireReminder;
    
    if (!templateId) {
      showToast('请先在配置中填写模板ID', 'none');
      return;
    }

    try {
      showLoading('测试中...');

      const result = await wx.cloud.callFunction({
        name: 'expire-reminder',
        data: {
          action: 'checkAndSend',
          templateId: templateId,
        },
      });

      hideLoading();

      if (result.result && result.result.errCode === 0) {
        if (result.result.data && result.result.data.count > 0) {
          showToast(`已发送提醒，发现${result.result.data.count}个即将过期的菜品`, 'success');
        } else {
          showToast('当前没有即将过期的菜品', 'none');
        }
      } else {
        showToast(result.result?.errMsg || '测试失败', 'none');
      }
    } catch (err) {
      hideLoading();
      console.error('测试提醒失败:', err);
      showToast('测试失败，请重试', 'none');
    }
  },

  /**
   * 清除缓存
   */
  async clearCache() {
    const confirm = await showModal('确定要清除缓存吗？', '提示');
    if (confirm) {
      try {
        // 清除本地缓存
        wx.clearStorageSync();
        showToast('缓存已清除', 'success');
      } catch (err) {
        console.error('清除缓存失败:', err);
        showToast('清除失败，请重试', 'none');
      }
    }
  },

});
