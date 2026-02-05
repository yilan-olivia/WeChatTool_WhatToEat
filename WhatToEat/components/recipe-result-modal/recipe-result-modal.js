/**
 * 食谱结果展示模态组件
 */
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
    // 食谱数据
    recipe: {
      type: Object,
      value: null,
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    nutritionData: [], // 营养数据
    formattedIngredients: [], // 格式化后的食材列表
    formattedSteps: [], // 格式化后的步骤列表
  },

  /**
   * 数据监听器
   */
  observers: {
    'recipe': function(recipe) {
      if (recipe) {
        this.processNutritionData(recipe);
        this.formatIngredients(recipe);
        this.formatSteps(recipe);
      }
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 处理营养数据
     */
    processNutritionData(recipe) {
      const nutritionData = [];

      if (recipe.calories !== undefined) {
        nutritionData.push({
          name: '热量',
          type: 'calories',
          value: parseFloat(recipe.calories) || 0,
          unit: '卡',
        });
      }

      if (recipe.protein !== undefined) {
        nutritionData.push({
          name: '蛋白质',
          type: 'protein',
          value: parseFloat(recipe.protein) || 0,
          unit: 'g',
        });
      }

      if (recipe.fat !== undefined) {
        nutritionData.push({
          name: '脂肪',
          type: 'fat',
          value: parseFloat(recipe.fat) || 0,
          unit: 'g',
        });
      }

      if (recipe.carbs !== undefined) {
        nutritionData.push({
          name: '碳水化合物',
          type: 'carbs',
          value: parseFloat(recipe.carbs) || 0,
          unit: 'g',
        });
      }

      // 如果有nutrition对象，优先使用
      if (recipe.nutrition) {
        const nutrition = recipe.nutrition;
        nutritionData.length = 0; // 清空原有数据

        if (nutrition.calories !== undefined) {
          nutritionData.push({
            name: '热量',
            type: 'calories',
            value: parseFloat(nutrition.calories) || 0,
            unit: '卡',
          });
        }

        if (nutrition.protein !== undefined) {
          nutritionData.push({
            name: '蛋白质',
            type: 'protein',
            value: parseFloat(nutrition.protein) || 0,
            unit: 'g',
          });
        }

        if (nutrition.fat !== undefined) {
          nutritionData.push({
            name: '脂肪',
            type: 'fat',
            value: parseFloat(nutrition.fat) || 0,
            unit: 'g',
          });
        }

        if (nutrition.carbs !== undefined) {
          nutritionData.push({
            name: '碳水化合物',
            type: 'carbs',
            value: parseFloat(nutrition.carbs) || 0,
            unit: 'g',
          });
        }
      }

      this.setData({ nutritionData });
    },

    /**
     * 关闭模态窗口
     */
    closeModal() {
      this.triggerEvent('close');
    },

    /**
     * 保存食谱
     */
    saveRecipe() {
      this.triggerEvent('save', {
        recipe: this.data.recipe,
      });
    },

    /**
     * 阻止事件冒泡
     */
    stopPropagation() {
      // 阻止点击内容区域时关闭模态窗口
    },

    /**
     * 格式化食材列表
     */
    formatIngredients(recipe) {
      if (!recipe || !recipe.ingredients || !Array.isArray(recipe.ingredients)) {
        this.setData({ formattedIngredients: [] });
        return;
      }

      const formatted = recipe.ingredients.map((item, index) => {
        if (typeof item === 'string') {
          return {
            name: item,
            amount: '',
            index: index + 1,
          };
        } else {
          return {
            name: item.name || item || '',
            amount: item.amount || '',
            index: index + 1,
          };
        }
      });

      this.setData({ formattedIngredients: formatted });
    },

    /**
     * 格式化步骤列表
     */
    formatSteps(recipe) {
      if (!recipe || !recipe.steps || !Array.isArray(recipe.steps)) {
        this.setData({ formattedSteps: [] });
        return;
      }

      const formatted = recipe.steps.map((item, index) => {
        if (typeof item === 'string') {
          return {
            text: item,
            index: index + 1,
          };
        } else {
          return {
            text: item.description || item.step || item || '',
            index: index + 1,
          };
        }
      });

      this.setData({ formattedSteps: formatted });
    },
  },
});
