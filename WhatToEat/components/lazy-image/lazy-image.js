/**
 * 图片懒加载组件
 */
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 图片地址
    src: {
      type: String,
      value: '',
    },
    // 占位图
    placeholder: {
      type: String,
      value: '/images/placeholder.png',
    },
    // 图片模式
    mode: {
      type: String,
      value: 'aspectFill',
    },
    // 错误提示文字
    errorText: {
      type: String,
      value: '图片加载失败',
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    loaded: false,
    error: false,
  },

  /**
   * 组件生命周期
   */
  attached() {
    // 如果src已存在，直接加载
    if (this.data.src) {
      this.setData({ loaded: true });
    }
  },

  /**
   * 属性观察器
   */
  observers: {
    'src': function(src) {
      if (src) {
        this.setData({
          loaded: false,
          error: false,
        });
        // 延迟加载，确保组件已渲染
        setTimeout(() => {
          this.setData({ loaded: true });
        }, 100);
      }
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 图片加载成功
     */
    onImageLoad(e) {
      this.setData({
        loaded: true,
        error: false,
      });
      this.triggerEvent('load', e.detail);
    },

    /**
     * 图片加载失败
     */
    onImageError(e) {
      this.setData({
        loaded: false,
        error: true,
      });
      this.triggerEvent('error', e.detail);
    },
  },
});
