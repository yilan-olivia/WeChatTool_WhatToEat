/**
 * 表单验证工具
 * 提供菜品信息、用户输入、图片格式等验证功能
 */

/**
 * 验证结果类
 */
class ValidationResult {
  constructor(isValid = true, errors = []) {
    this.isValid = isValid;
    this.errors = errors;
  }

  addError(field, message) {
    this.errors.push({ field, message });
    this.isValid = false;
  }

  getFirstError() {
    return this.errors.length > 0 ? this.errors[0].message : '';
  }
}

/**
 * 验证菜品名称
 * @param {string} name 菜品名称
 * @returns {Object} 返回 {isValid, message}
 */
export function validateFoodName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, message: '菜品名称不能为空' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { isValid: false, message: '菜品名称不能为空' };
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, message: '菜品名称不能超过50个字符' };
  }
  
  return { isValid: true, message: '' };
}

/**
 * 验证菜品分类
 * @param {string} category 分类
 * @returns {Object} 返回 {isValid, message}
 */
export function validateFoodCategory(category) {
  const validCategories = ['蔬菜', '水果', '肉类', '海鲜', '调料', '其他'];
  
  if (!category) {
    return { isValid: false, message: '请选择菜品分类' };
  }
  
  if (!validCategories.includes(category)) {
    return { isValid: false, message: '无效的菜品分类' };
  }
  
  return { isValid: true, message: '' };
}

/**
 * 验证保质期
 * @param {Date|string} expireDate 过期日期
 * @returns {Object} 返回 {isValid, message}
 */
export function validateExpireDate(expireDate) {
  if (!expireDate) {
    return { isValid: false, message: '请选择保质期' };
  }
  
  const date = expireDate instanceof Date ? expireDate : new Date(expireDate);
  
  if (isNaN(date.getTime())) {
    return { isValid: false, message: '无效的日期格式' };
  }
  
  return { isValid: true, message: '' };
}

/**
 * 验证手机号
 * @param {string} phone 手机号
 * @returns {Object} 返回 {isValid, message}
 */
export function validatePhone(phone) {
  if (!phone) {
    return { isValid: false, message: '手机号不能为空' };
  }
  
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return { isValid: false, message: '请输入正确的手机号' };
  }
  
  return { isValid: true, message: '' };
}

/**
 * 验证邮箱
 * @param {string} email 邮箱
 * @returns {Object} 返回 {isValid, message}
 */
export function validateEmail(email) {
  if (!email) {
    return { isValid: false, message: '邮箱不能为空' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: '请输入正确的邮箱地址' };
  }
  
  return { isValid: true, message: '' };
}

/**
 * 验证昵称
 * @param {string} nickName 昵称
 * @returns {Object} 返回 {isValid, message}
 */
export function validateNickName(nickName) {
  if (!nickName || typeof nickName !== 'string') {
    return { isValid: false, message: '昵称不能为空' };
  }
  
  const trimmed = nickName.trim();
  if (trimmed.length === 0) {
    return { isValid: false, message: '昵称不能为空' };
  }
  
  if (trimmed.length < 2) {
    return { isValid: false, message: '昵称至少2个字符' };
  }
  
  if (trimmed.length > 20) {
    return { isValid: false, message: '昵称不能超过20个字符' };
  }
  
  return { isValid: true, message: '' };
}

/**
 * 验证图片文件
 * @param {string} filePath 文件路径
 * @param {Object} options 选项
 * @param {number} options.maxSize 最大文件大小（字节），默认5MB
 * @param {Array<string>} options.allowedTypes 允许的文件类型，默认['jpg', 'jpeg', 'png', 'webp']
 * @returns {Promise<Object>} 返回 {isValid, message}
 */
export async function validateImageFile(filePath, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB
    allowedTypes = ['jpg', 'jpeg', 'png', 'webp'],
  } = options;

  if (!filePath) {
    return { isValid: false, message: '请选择图片' };
  }

  try {
    // 获取文件信息
    const fileInfo = await new Promise((resolve, reject) => {
      wx.getFileInfo({
        filePath,
        success: resolve,
        fail: reject,
      });
    });

    // 检查文件大小
    if (fileInfo.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
      return { isValid: false, message: `图片大小不能超过${maxSizeMB}MB` };
    }

    // 检查文件类型（通过扩展名）
    const ext = filePath.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return { isValid: false, message: `图片格式必须是：${allowedTypes.join('、')}` };
    }

    return { isValid: true, message: '' };
  } catch (err) {
    console.error('验证图片文件失败:', err);
    return { isValid: false, message: '图片文件无效' };
  }
}

/**
 * 验证图片尺寸
 * @param {string} filePath 文件路径
 * @param {Object} options 选项
 * @param {number} options.maxWidth 最大宽度
 * @param {number} options.maxHeight 最大高度
 * @returns {Promise<Object>} 返回 {isValid, message, width, height}
 */
export async function validateImageSize(filePath, options = {}) {
  const {
    maxWidth = 4096,
    maxHeight = 4096,
  } = options;

  if (!filePath) {
    return { isValid: false, message: '请选择图片' };
  }

  try {
    const imageInfo = await new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: filePath,
        success: resolve,
        fail: reject,
      });
    });

    if (imageInfo.width > maxWidth || imageInfo.height > maxHeight) {
      return {
        isValid: false,
        message: `图片尺寸不能超过 ${maxWidth}x${maxHeight}`,
        width: imageInfo.width,
        height: imageInfo.height,
      };
    }

    return {
      isValid: true,
      message: '',
      width: imageInfo.width,
      height: imageInfo.height,
    };
  } catch (err) {
    console.error('验证图片尺寸失败:', err);
    return { isValid: false, message: '获取图片信息失败' };
  }
}

/**
 * 验证必填项
 * @param {Object} data 数据对象
 * @param {Array<string>} requiredFields 必填字段数组
 * @returns {ValidationResult}
 */
export function validateRequired(data, requiredFields) {
  const result = new ValidationResult();

  for (const field of requiredFields) {
    const value = data[field];
    
    if (value === undefined || value === null || value === '') {
      result.addError(field, `${field} 是必填项`);
    }
  }

  return result;
}

/**
 * 验证菜品信息
 * @param {Object} foodData 菜品数据
 * @returns {ValidationResult}
 */
export function validateFoodData(foodData) {
  const result = new ValidationResult();

  // 验证名称
  const nameResult = validateFoodName(foodData.name);
  if (!nameResult.isValid) {
    result.addError('name', nameResult.message);
  }

  // 验证分类
  if (foodData.category) {
    const categoryResult = validateFoodCategory(foodData.category);
    if (!categoryResult.isValid) {
      result.addError('category', categoryResult.message);
    }
  }

  // 验证保质期
  if (foodData.expireDate) {
    const expireResult = validateExpireDate(foodData.expireDate);
    if (!expireResult.isValid) {
      result.addError('expireDate', expireResult.message);
    }
  }

  return result;
}

/**
 * 验证食谱信息
 * @param {Object} recipeData 食谱数据
 * @returns {ValidationResult}
 */
export function validateRecipeData(recipeData) {
  const result = new ValidationResult();

  // 验证名称
  if (!recipeData.name || recipeData.name.trim().length === 0) {
    result.addError('name', '食谱名称不能为空');
  } else if (recipeData.name.length > 100) {
    result.addError('name', '食谱名称不能超过100个字符');
  }

  // 验证食材
  if (!recipeData.ingredients || !Array.isArray(recipeData.ingredients) || recipeData.ingredients.length === 0) {
    result.addError('ingredients', '至少需要一个食材');
  }

  // 验证制作步骤
  if (!recipeData.steps || !Array.isArray(recipeData.steps) || recipeData.steps.length === 0) {
    result.addError('steps', '至少需要一个制作步骤');
  }

  return result;
}

/**
 * 自定义验证规则
 * @param {any} value 要验证的值
 * @param {Function} validator 验证函数
 * @returns {Object} 返回 {isValid, message}
 */
export function customValidate(value, validator) {
  if (typeof validator !== 'function') {
    return { isValid: false, message: '验证函数无效' };
  }

  try {
    const result = validator(value);
    if (typeof result === 'boolean') {
      return { isValid: result, message: result ? '' : '验证失败' };
    } else if (result && typeof result === 'object') {
      return { isValid: result.isValid !== false, message: result.message || '' };
    }
    return { isValid: false, message: '验证函数返回值无效' };
  } catch (err) {
    console.error('自定义验证失败:', err);
    return { isValid: false, message: '验证过程出错' };
  }
}
