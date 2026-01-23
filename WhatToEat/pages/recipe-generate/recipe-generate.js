/**
 * 食谱生成页
 */
import { queryData, addData, dbCollections, dbCommand } from '../../utils/db.js';
import { showToast, showLoading, hideLoading } from '../../utils/util.js';
import { callCloudFunction, cloudFunctions } from '../../utils/request.js';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    loadingText: '加载中...',
    availableFoods: [], // 可用菜品列表
    selectedFoods: [], // 选中的菜品ID
    preferences: ['清淡', '香辣', '酸甜', '咸鲜', '无要求'], // 口味偏好选项
    preference: '无要求', // 当前选中的偏好
    generating: false, // 是否正在生成
    generatedRecipe: null, // 生成的食谱
    nutritionData: [], // 营养数据
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    await this.loadAvailableFoods();
  },

  /**
   * 加载可用菜品
   */
  async loadAvailableFoods() {
    this.setData({ loading: true });

    try {
      // 查询未过期的菜品
      const now = new Date();
      const foods = await queryData(
        dbCollections.foods,
        {
          status: dbCommand.neq('expired'),
        },
        {
          orderBy: { field: 'createTime', order: 'desc' },
        }
      );

      this.setData({ availableFoods: foods });
    } catch (err) {
      console.error('加载菜品失败:', err);
      showToast('加载失败，请重试', 'none');
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 切换菜品选择
   */
  toggleFood(e) {
    const id = e.currentTarget.dataset.id;
    const selectedFoods = [...this.data.selectedFoods];
    const index = selectedFoods.indexOf(id);

    if (index > -1) {
      selectedFoods.splice(index, 1);
    } else {
      selectedFoods.push(id);
    }

    this.setData({ selectedFoods });
  },

  /**
   * 选择偏好
   */
  selectPreference(e) {
    const preference = e.currentTarget.dataset.preference;
    this.setData({ preference });
  },

  /**
   * 生成食谱
   */
  async generateRecipe() {
    if (this.data.selectedFoods.length === 0) {
      showToast('请至少选择一个菜品', 'none');
      return;
    }

    this.setData({ 
      generating: true,
      loading: true,
      loadingText: 'AI正在生成食谱...',
    });

    try {
      // 获取选中的菜品信息
      const selectedFoodsData = this.data.availableFoods.filter(food =>
        this.data.selectedFoods.includes(food.id)
      );

      // 调用云函数生成食谱
      const result = await wx.cloud.callFunction({
        name: 'recipe-generate',
        data: {
          foods: selectedFoodsData.map(f => f.name),
          preference: this.data.preference,
        },
      });

      // 处理生成结果
      if (result.result.errCode === 0) {
        const generatedRecipe = result.result.data;
        
        // 计算营养数据
        const nutritionData = this.calculateNutritionData(generatedRecipe);

        this.setData({
          generatedRecipe,
          nutritionData,
        });

        showToast('食谱生成成功', 'success');
      } else {
        // 生成失败，使用降级方案（模拟数据）
        const mockRecipe = {
          name: `${selectedFoodsData.map(f => f.name).join('、')} 炒菜`,
          difficulty: '简单',
          time: '30分钟',
          calories: '350',
          ingredients: selectedFoodsData.map(f => f.name),
          steps: [
            '将选中的菜品清洗干净，切好备用',
            '热锅下油，放入调料爆香',
            '依次加入菜品，翻炒均匀',
            '加入适量调味料，炒至熟透即可',
          ],
        };

        // 计算营养数据
        const nutritionData = this.calculateNutritionData(mockRecipe);

        this.setData({
          generatedRecipe: mockRecipe,
          nutritionData,
        });

        showToast('生成失败，使用默认结果', 'none');
      }
    } catch (err) {
      console.error('生成食谱失败:', err);
      // 出错时使用模拟数据
      const selectedFoodsData = this.data.availableFoods.filter(food =>
        this.data.selectedFoods.includes(food.id)
      );

      const mockRecipe = {
        name: `${selectedFoodsData.map(f => f.name).join('、')} 炒菜`,
        difficulty: '简单',
        time: '30分钟',
        calories: '350',
        ingredients: selectedFoodsData.map(f => f.name),
        steps: [
          '将选中的菜品清洗干净，切好备用',
          '热锅下油，放入调料爆香',
          '依次加入菜品，翻炒均匀',
          '加入适量调味料，炒至熟透即可',
        ],
      };

      // 计算营养数据
      const nutritionData = this.calculateNutritionData(mockRecipe);

      this.setData({
        generatedRecipe: mockRecipe,
        nutritionData,
      });

      showToast('生成失败，使用默认结果', 'none');
    } finally {
      this.setData({ 
        generating: false,
        loading: false,
      });
    }
  },

  /**
   * 保存食谱
   */
  async saveRecipe() {
    if (!this.data.generatedRecipe) {
      return;
    }

    this.setData({ 
      loading: true,
      loadingText: '保存中...',
    });

    try {
      await addData(dbCollections.recipes, {
        ...this.data.generatedRecipe,
        foodIds: this.data.selectedFoods,
        preference: this.data.preference,
      });

      showToast('保存成功', 'success');
    } catch (err) {
      console.error('保存失败:', err);
      showToast('保存失败，请重试', 'none');
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 计算营养数据
   */
  calculateNutritionData(recipe) {
    const nutritionData = [];
    
    if (recipe.calories) {
      nutritionData.push({
        name: '热量',
        type: 'calories',
        value: parseFloat(recipe.calories) || 0,
        unit: '卡',
      });
    }
    
    if (recipe.protein) {
      nutritionData.push({
        name: '蛋白质',
        type: 'protein',
        value: parseFloat(recipe.protein) || 0,
        unit: 'g',
      });
    }
    
    if (recipe.fat) {
      nutritionData.push({
        name: '脂肪',
        type: 'fat',
        value: parseFloat(recipe.fat) || 0,
        unit: 'g',
      });
    }
    
    if (recipe.carbs) {
      nutritionData.push({
        name: '碳水化合物',
        type: 'carbs',
        value: parseFloat(recipe.carbs) || 0,
        unit: 'g',
      });
    }
    
    return nutritionData;
  },

  /**
   * 食谱卡片点击事件
   */
  onRecipeTap(e) {
    // 可以跳转到食谱详情页
    console.log('点击食谱:', e.detail.recipe);
  },

  /**
   * 分享食谱
   */
  shareRecipe() {
    if (!this.data.generatedRecipe) {
      return;
    }

    // 可以调用微信分享功能
    wx.showShareMenu({
      withShareTicket: true,
    });
  },
});


