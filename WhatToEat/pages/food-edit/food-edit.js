/**
 * 菜品编辑页
 * 用于添加和编辑菜品
 */
import { addData, updateData, getDataById, deleteData, dbCollections } from '../../utils/db.js';
import { showToast, showModal } from '../../utils/util.js';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    isEdit: false,
    foodId: '',
    food: {
      name: '',
      category: '蔬菜',
      quantity: '',
      unit: '克',
      expireDate: '',
      status: 'fresh',
      image: '',
      notes: '',
    },
    categories: ['蔬菜', '水果', '肉类', '海鲜', '调料', '其他'],
    units: ['克', '千克', '个', '包', '瓶', '盒', '斤'],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ isEdit: true, foodId: id });
      this.loadFoodData(id);
    } else {
      // 设置默认过期时间为7天后
      const defaultExpireDate = new Date();
      defaultExpireDate.setDate(defaultExpireDate.getDate() + 7);
      this.setData({
        'food.expireDate': this.formatDate(defaultExpireDate),
      });
    }
  },

  /**
   * 加载菜品数据
   */
  async loadFoodData(id) {
    this.setData({ loading: true });
    try {
      const food = await getDataById(dbCollections.foods, id);
      this.setData({ food });
    } catch (err) {
      console.error('加载菜品数据失败:', err);
      showToast('加载失败，请重试', 'none');
      wx.navigateBack();
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 输入框输入事件
   */
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`food.${field}`]: e.detail.value,
    });
  },

  /**
   * 分类选择
   */
  onCategoryChange(e) {
    const index = e.detail.value;
    this.setData({
      'food.category': this.data.categories[index],
    });
  },

  /**
   * 单位选择
   */
  onUnitChange(e) {
    const index = e.detail.value;
    this.setData({
      'food.unit': this.data.units[index],
    });
  },

  /**
   * 日期选择
   */
  onDateChange(e) {
    this.setData({
      'food.expireDate': e.detail.value,
    });
  },

  /**
   * 上传图片
   */
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 这里应该上传到云存储，暂时使用本地路径
        this.setData({
          'food.image': res.tempFiles[0].tempFilePath,
        });
      },
    });
  },

  /**
   * 保存菜品
   */
  async saveFood() {
    // 表单验证
    if (!this.data.food.name) {
      showToast('请输入菜品名称', 'none');
      return;
    }

    this.setData({ loading: true });

    try {
      // 复制food对象并移除_id和_openid字段（如果存在）
      const foodData = { ...this.data.food };
      delete foodData._id;
      delete foodData._openid;
      
      if (this.data.isEdit) {
        // 更新菜品
        await updateData(dbCollections.foods, this.data.foodId, foodData);
        showToast('更新成功', 'success');
      } else {
        // 添加新菜品
        await addData(dbCollections.foods, foodData);
        showToast('添加成功', 'success');
      }
      wx.navigateBack();
    } catch (err) {
      console.error('保存菜品失败:', err);
      showToast('保存失败，请重试', 'none');
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 删除菜品
   */
  async deleteFood() {
    if (!this.data.isEdit) return;

    showModal('确定要删除这个菜品吗？', '确认删除').then(async (res) => {
      if (res.confirm) {
        this.setData({ loading: true });
        try {
          // 使用deleteData函数删除菜品
          await deleteData(dbCollections.foods, this.data.foodId);
          showToast('删除成功', 'success');
          wx.navigateBack();
        } catch (err) {
          console.error('删除菜品失败:', err);
          showToast('删除失败，请重试', 'none');
        } finally {
          this.setData({ loading: false });
        }
      }
    });
  },
});