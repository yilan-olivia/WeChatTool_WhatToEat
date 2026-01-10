/**
 * 空状态组件
 */
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 图标路径
    icon: {
      type: String,
      value: '',
    },
    // 提示文字
    text: {
      type: String,
      value: '暂无数据',
    },
    // 是否显示操作按钮区域
    showAction: {
      type: Boolean,
      value: false,
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
