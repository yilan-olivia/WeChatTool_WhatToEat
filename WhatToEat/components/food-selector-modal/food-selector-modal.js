/**
 * 菜品选择模态组件
 */
import { queryData, dbCollections, dbCommand } from '../../utils/db.js';
import { showToast } from '../../utils/util.js';

const app = getApp();

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示模态窗口
    show: {
      type: Boolean,
      value: false,
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    loading: false,
    allFoods: [], // 所有菜品
    filteredFoods: [], // 筛选后的菜品
    selectedFoodIds: [], // 选中的菜品ID列表
    searchKeyword: '', // 搜索关键词
    selectedCategory: '全部', // 当前选中的分类
    categories: ['全部', '蔬菜', '水果', '肉类', '海鲜', '调料', '其他'], // 分类列表
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件挂载时加载菜品列表
      if (this.data.show) {
        this.loadFoods();
      }
    },
  },

  /**
   * 数据监听器
   */
  observers: {
    'show': function(show) {
      if (show) {
        this.loadFoods();
      } else {
        // 关闭时重置状态
        this.setData({
          searchKeyword: '',
          selectedCategory: '全部',
          selectedFoodIds: [],
        });
      }
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 获取当前用户ID
     */
    async getUserId() {
      // 先从全局数据获取
      let userId = app.globalData.openid;
      
      // 如果全局数据中没有，尝试从云函数获取
      if (!userId) {
        try {
          const { callCloudFunction } = await import('../../utils/request.js');
          const loginResult = await callCloudFunction('login', {}, { 
            showLoading: false, 
            showError: false 
          });
          if (loginResult && loginResult.data && loginResult.data.openid) {
            userId = loginResult.data.openid;
            app.globalData.openid = userId;
          }
        } catch (err) {
          console.warn('获取用户ID失败:', err);
        }
      }

      return userId;
    },

    /**
     * 加载菜品列表
     */
    async loadFoods() {
      this.setData({ loading: true });

      try {
        // 获取当前用户ID
        const userId = await this.getUserId();
        
        if (!userId) {
          showToast('请先登录', 'none');
          this.setData({ loading: false });
          return;
        }

        // 查询未过期的菜品，必须包含userId和isDeleted条件以符合安全规则
        const foods = await queryData(
          dbCollections.foods,
          {
            userId: userId,
            isDeleted: false,
            status: dbCommand.neq('expired'),
          },
          {
            orderBy: { field: 'createTime', order: 'desc' },
          }
        );

        this.setData({
          allFoods: foods,
          filteredFoods: foods,
        });
      } catch (err) {
        console.error('加载菜品失败:', err);
        showToast('加载失败，请重试', 'none');
      } finally {
        this.setData({ loading: false });
      }
    },

    /**
     * 搜索菜品
     */
    onSearchInput(e) {
      const keyword = e.detail.value.trim();
      this.setData({ searchKeyword: keyword });
      this.filterFoods();
    },

    /**
     * 选择分类
     */
    selectCategory(e) {
      const category = e.currentTarget.dataset.category;
      this.setData({ selectedCategory: category });
      this.filterFoods();
    },

    /**
     * 筛选菜品
     */
    filterFoods() {
      const { allFoods, searchKeyword, selectedCategory } = this.data;
      let filtered = [...allFoods];

      // 按分类筛选
      if (selectedCategory !== '全部') {
        filtered = filtered.filter(food => food.category === selectedCategory);
      }

      // 按关键词搜索
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        filtered = filtered.filter(food =>
          food.name && food.name.toLowerCase().includes(keyword)
        );
      }

      this.setData({ filteredFoods: filtered });
    },

    /**
     * 切换菜品选择状态
     */
    toggleFood(e) {
      const foodId = e.currentTarget.dataset.id;
      const selectedFoodIds = [...this.data.selectedFoodIds];
      const index = selectedFoodIds.indexOf(foodId);

      if (index > -1) {
        selectedFoodIds.splice(index, 1);
      } else {
        selectedFoodIds.push(foodId);
      }

      this.setData({ selectedFoodIds });
    },

    /**
     * 确认选择
     */
    confirmSelection() {
      if (this.data.selectedFoodIds.length === 0) {
        showToast('请至少选择一个菜品', 'none');
        return;
      }

      // 获取选中的菜品数据
      const selectedFoods = this.data.allFoods.filter(food =>
        this.data.selectedFoodIds.includes(food._id || food.id)
      );

      // 触发确认事件，传递选中的菜品ID列表
      // 注意：不在这里关闭模态窗口，由父组件处理
      this.triggerEvent('confirm', {
        foodIds: this.data.selectedFoodIds,
        foods: selectedFoods,
      });
    },

    /**
     * 取消选择
     */
    cancelSelection() {
      this.closeModal();
    },

    /**
     * 关闭模态窗口
     */
    closeModal() {
      this.triggerEvent('close');
    },

    /**
     * 阻止事件冒泡
     */
    stopPropagation() {
      // 阻止点击内容区域时关闭模态窗口
    },
  },
});
