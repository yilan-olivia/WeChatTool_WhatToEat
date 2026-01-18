/**
 * 参数验证工具
 * 提供常用的参数验证方法
 */

/**
 * 验证结果类
 */
class ValidationResult {
  constructor(isValid, errors = []) {
    this.isValid = isValid;
    this.errors = errors;
  }

  addError(field, message) {
    this.errors.push({ field, message });
    this.isValid = false;
  }
}

/**
 * 验证器类
 */
class Validator {
  constructor() {
    this.rules = {};
  }

  /**
   * 添加验证规则
   * @param {string} field 字段名
   * @param {Object} rule 验证规则
   */
  addRule(field, rule) {
    this.rules[field] = rule;
    return this;
  }

  /**
   * 验证数据
   * @param {Object} data 要验证的数据
   * @returns {ValidationResult}
   */
  validate(data) {
    const result = new ValidationResult(true);

    for (const [field, rule] of Object.entries(this.rules)) {
      const value = data[field];

      // 必填验证
      if (rule.required && (value === undefined || value === null || value === '')) {
        result.addError(field, `${field} 是必填字段`);
        continue;
      }

      // 如果字段为空且不是必填，跳过其他验证
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // 类型验证
      if (rule.type && !this.checkType(value, rule.type)) {
        result.addError(field, `${field} 的类型必须是 ${rule.type}`);
        continue;
      }

      // 字符串验证
      if (rule.type === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          result.addError(field, `${field} 的长度不能少于 ${rule.minLength} 个字符`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          result.addError(field, `${field} 的长度不能超过 ${rule.maxLength} 个字符`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          result.addError(field, `${field} 的格式不正确`);
        }
        if (rule.enum && !rule.enum.includes(value)) {
          result.addError(field, `${field} 的值必须是以下之一: ${rule.enum.join(', ')}`);
        }
      }

      // 数字验证
      if (rule.type === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          result.addError(field, `${field} 的值不能小于 ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          result.addError(field, `${field} 的值不能大于 ${rule.max}`);
        }
      }

      // 数组验证
      if (rule.type === 'array') {
        if (rule.minLength && value.length < rule.minLength) {
          result.addError(field, `${field} 数组的长度不能少于 ${rule.minLength}`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          result.addError(field, `${field} 数组的长度不能超过 ${rule.maxLength}`);
        }
        if (rule.itemType && value.some(item => !this.checkType(item, rule.itemType))) {
          result.addError(field, `${field} 数组中的元素类型必须是 ${rule.itemType}`);
        }
      }

      // 自定义验证函数
      if (rule.validator && typeof rule.validator === 'function') {
        const customResult = rule.validator(value, data);
        if (customResult !== true) {
          result.addError(field, customResult || `${field} 验证失败`);
        }
      }
    }

    return result;
  }

  /**
   * 检查类型
   * @param {any} value 值
   * @param {string} type 类型
   * @returns {boolean}
   */
  checkType(value, type) {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));
      default:
        return true;
    }
  }
}

/**
 * 创建验证器
 * @returns {Validator}
 */
function createValidator() {
  return new Validator();
}

/**
 * 快速验证函数
 * @param {Object} data 要验证的数据
 * @param {Object} rules 验证规则
 * @returns {ValidationResult}
 */
function validate(data, rules) {
  const validator = createValidator();
  for (const [field, rule] of Object.entries(rules)) {
    validator.addRule(field, rule);
  }
  return validator.validate(data);
}

/**
 * 常用验证规则
 */
const commonRules = {
  required: (field) => ({
    type: 'string',
    required: true,
    minLength: 1,
  }),
  optionalString: (field, maxLength = 1000) => ({
    type: 'string',
    required: false,
    maxLength,
  }),
  userId: {
    type: 'string',
    required: true,
    minLength: 1,
  },
  date: {
    type: 'date',
    required: true,
  },
  positiveNumber: (min = 0, max = null) => ({
    type: 'number',
    required: true,
    min,
    max,
  }),
  array: (minLength = 0, maxLength = null) => ({
    type: 'array',
    required: true,
    minLength,
    maxLength,
  }),
};

module.exports = {
  Validator,
  createValidator,
  validate,
  commonRules,
  ValidationResult,
};
