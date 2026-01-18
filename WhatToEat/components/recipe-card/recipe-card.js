/**
 * 食谱卡片组件
 */
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 食谱数据
    recipe: {
      type: Object,
      value: {},
    },
    // 是否显示图片
    showImage: {
      type: Boolean,
      value: true,
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    ingredientsText: '',
  },

  /**
   * 组件生命周期
   */
  attached() {
    this.updateIngredientsText();
  },

  /**
   * 属性观察器
   */
  observers: {
    'recipe.ingredients': function(ingredients) {
      this.updateIngredientsText();
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 更新食材文本
     */
    updateIngredientsText() {
      const { recipe } = this.data;
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        let text = '';
        if (recipe.ingredients.length > 0) {
          if (typeof recipe.ingredients[0] === 'string') {
            text = recipe.ingredients.join('、');
          } else if (typeof recipe.ingredients[0] === 'object') {
            text = recipe.ingredients.map(item => item.name || item).join('、');
          }
        }
        this.setData({
          ingredientsText: text,
        });
      }
    },

    /**
     * 卡片点击事件
     */
    onCardTap() {
      this.triggerEvent('tap', {
        recipe: this.data.recipe,
      });
    },
  },
});
