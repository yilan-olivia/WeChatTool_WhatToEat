/**
 * 加载更多组件
 */
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示
    show: {
      type: Boolean,
      value: false,
    },
    // 是否正在加载
    loading: {
      type: Boolean,
      value: false,
    },
    // 加载文字
    loadingText: {
      type: String,
      value: '加载中...',
    },
    // 没有更多文字
    noMoreText: {
      type: String,
      value: '没有更多了',
    },
  },

  /**
   * 组件的初始数据
   */
  data: {},

  /**
   * 组件的方法列表
   */
  methods: {},
});
