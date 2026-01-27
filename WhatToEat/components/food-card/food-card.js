/**
 * 菜品卡片组件
 */
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 菜品数据
    food: {
      type: Object,
      value: {},
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    statusTextMap: {
      fresh: '新鲜',
      warning: '即将过期',
      expired: '已过期',
    },
  },

  /**
   * 计算属性
   */
  observers: {
    'food.status': function(status) {
      const statusTextMap = {
        fresh: '新鲜',
        warning: '即将过期',
        expired: '已过期',
      };
      this.setData({
        statusText: statusTextMap[status] || '',
      });
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 卡片点击事件
     */
    onCardTap() {
      this.triggerEvent('tap', {
        food: this.data.food,
      });
    },

    /**
     * 卡片长按事件
     */
    onCardLongPress() {
      this.triggerEvent('longpress', {
        food: this.data.food,
      });
    },
  },
});