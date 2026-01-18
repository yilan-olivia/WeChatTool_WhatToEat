/**
 * 相机遮罩组件
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
    // 标题
    title: {
      type: String,
      value: '提示',
    },
    // 是否显示底部
    showFooter: {
      type: Boolean,
      value: false,
    },
    // 点击遮罩是否关闭
    maskClosable: {
      type: Boolean,
      value: true,
    },
  },

  /**
   * 组件的初始数据
   */
  data: {},

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 遮罩点击事件
     */
    onMaskTap() {
      if (this.data.maskClosable) {
        this.onClose();
      }
    },

    /**
     * 关闭事件
     */
    onClose() {
      this.triggerEvent('close');
    },
  },
});
