/**
 * 虚拟列表组件
 * 只渲染可见区域的列表项，优化长列表性能
 */
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 列表数据
    list: {
      type: Array,
      value: [],
    },
    // 列表项高度（rpx）
    itemHeight: {
      type: Number,
      value: 100,
    },
    // 容器高度（rpx）
    height: {
      type: Number,
      value: 600,
    },
    // 缓冲区（上下各多渲染几个）
    buffer: {
      type: Number,
      value: 3,
    },
    // 数据项的key字段名
    itemKey: {
      type: String,
      value: 'id',
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    scrollTop: 0,
    visibleItems: [],
    totalHeight: 0,
  },

  /**
   * 组件生命周期
   */
  attached() {
    this.updateVisibleItems();
  },

  /**
   * 属性观察器
   */
  observers: {
    'list': function() {
      this.updateVisibleItems();
    },
    'itemHeight, height': function() {
      this.updateVisibleItems();
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 更新可见项
     */
    updateVisibleItems() {
      const { list, itemHeight, height, buffer } = this.properties;
      const { scrollTop = 0 } = this.data;
      
      if (!list || list.length === 0) {
        this.setData({
          visibleItems: [],
          totalHeight: 0,
        });
        return;
      }

      // 计算总高度
      const totalHeight = list.length * itemHeight;
      
      // 计算可见范围
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
      const endIndex = Math.min(
        list.length - 1,
        Math.ceil((scrollTop + height) / itemHeight) + buffer
      );
      
      // 生成可见项
      const visibleItems = [];
      for (let i = startIndex; i <= endIndex; i++) {
        visibleItems.push({
          index: i,
          data: list[i],
          top: i * itemHeight,
        });
      }
      
      this.setData({
        visibleItems,
        totalHeight,
      });
    },

    /**
     * 滚动事件
     */
    onScroll(e) {
      const scrollTop = e.detail.scrollTop;
      this.setData({ scrollTop });
      this.updateVisibleItems();
    },
  },
});
