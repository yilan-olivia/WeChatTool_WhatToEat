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
    'food.status, food.expireDate': function(status, expireDate) {
      // 如果有保质期，根据保质期动态计算状态
      if (expireDate) {
        const now = new Date();
        const expireTime = new Date(expireDate);
        const diffDays = Math.floor((expireTime - now) / (1000 * 60 * 60 * 24));
        
        let calculatedStatus = 'fresh';
        if (diffDays < 0) {
          calculatedStatus = 'expired'; // 已过期
        } else if (diffDays <= 3) {
          calculatedStatus = 'warning'; // 即将过期（3天内）
        } else {
          calculatedStatus = 'fresh'; // 新鲜
        }
        
        const statusTextMap = {
          fresh: '新鲜',
          warning: '即将过期',
          expired: '已过期',
        };
        
        this.setData({
          statusText: statusTextMap[calculatedStatus] || '',
          calculatedStatus: calculatedStatus,
        });
      } else {
        // 如果没有保质期，使用原始状态
        const statusTextMap = {
          fresh: '新鲜',
          warning: '即将过期',
          expired: '已过期',
        };
        this.setData({
          statusText: statusTextMap[status] || '',
          calculatedStatus: status,
        });
      }
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
      this.triggerEvent('cardtap', {
        food: this.data.food,
      });
    },

    /**
     * 卡片长按事件
     */
    onCardLongPress() {
      this.triggerEvent('cardlongpress', {
        food: this.data.food,
      });
    },
  },
});