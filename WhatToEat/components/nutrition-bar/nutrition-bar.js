/**
 * 营养进度条组件
 */
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 营养数据数组
    nutritionData: {
      type: Array,
      value: [],
    },
    // 是否显示百分比
    showPercentage: {
      type: Boolean,
      value: true,
    },
    // 最大值（用于计算百分比）
    maxValues: {
      type: Object,
      value: {
        calories: 2000,
        protein: 100,
        fat: 80,
        carbs: 300,
      },
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    processedNutritionData: [],
  },

  /**
   * 组件生命周期
   */
  attached() {
    this.processNutritionData();
  },

  /**
   * 属性观察器
   */
  observers: {
    'nutritionData': function(data) {
      this.processNutritionData();
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 处理营养数据，计算百分比
     */
    processNutritionData() {
      const { nutritionData, maxValues } = this.properties;
      
      if (!Array.isArray(nutritionData) || nutritionData.length === 0) {
        this.setData({
          processedNutritionData: [],
        });
        return;
      }

      const processed = nutritionData.map(item => {
        const value = parseFloat(item.value) || 0;
        const maxValue = maxValues[item.type] || maxValues.calories || 2000;
        const percentage = Math.min((value / maxValue) * 100, 100);
        
        return {
          ...item,
          percentage: Math.round(percentage),
          colorClass: item.colorClass || this.getColorClass(item.type || item.name),
        };
      });

      this.setData({
        processedNutritionData: processed,
      });
    },

    /**
     * 获取颜色类名
     */
    getColorClass(type) {
      const colorMap = {
        calories: 'calories',
        protein: 'protein',
        fat: 'fat',
        carbs: 'carbs',
        热量: 'calories',
        蛋白质: 'protein',
        脂肪: 'fat',
        碳水化合物: 'carbs',
      };
      return colorMap[type] || 'default';
    },
  },
});
