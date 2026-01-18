# 云函数使用说明

本文档说明「家庭菜品管理与智能食谱」小程序的云函数使用方法。

## 云函数列表

### 1. food-recognition（菜品识别）
**功能**：调用AI API识别菜品图片

**调用示例**：
```javascript
wx.cloud.callFunction({
  name: 'food-recognition',
  data: {
    fileID: 'cloud://xxx.jpg'
  }
})
```

**返回数据**：
```javascript
{
  errCode: 0,
  errMsg: 'success',
  data: {
    name: '西红柿',
    category: '蔬菜',
    confidence: 0.95
  }
}
```

### 2. recipe-generate（智能食谱生成）
**功能**：根据菜品和偏好生成智能食谱

**调用示例**：
```javascript
wx.cloud.callFunction({
  name: 'recipe-generate',
  data: {
    foods: ['西红柿', '鸡蛋'],
    preference: '清淡'
  }
})
```

### 3. report-generate（健康报告生成）
**功能**：生成用户健康报告

**调用示例**：
```javascript
wx.cloud.callFunction({
  name: 'report-generate',
  data: {
    startDate: '2024-01-01',
    endDate: '2024-01-07'
  }
})
```

### 4. user-login（用户登录管理）
**功能**：处理用户登录、注册、信息更新

**调用示例**：
```javascript
// 登录
wx.cloud.callFunction({
  name: 'user-login',
  data: {
    action: 'login',
    userInfo: { nickName: 'xxx', avatarUrl: 'xxx' }
  }
})

// 获取用户信息
wx.cloud.callFunction({
  name: 'user-login',
  data: {
    action: 'get'
  }
})
```

### 5. image-upload（图片上传处理）
**功能**：处理图片上传、压缩、格式转换

**调用示例**：
```javascript
wx.cloud.callFunction({
  name: 'image-upload',
  data: {
    filePath: '/tmp/xxx.jpg',
    type: 'food' // food/recipe/avatar
  }
})
```

### 6. community（社区互动）
**功能**：处理社区动态的点赞、发布等操作

**调用示例**：
```javascript
// 点赞
wx.cloud.callFunction({
  name: 'community',
  data: {
    action: 'like',
    postId: 'xxx'
  }
})

// 发布动态
wx.cloud.callFunction({
  name: 'community',
  data: {
    action: 'publish',
    data: {
      content: '今天做了好吃的！',
      images: ['fileID1', 'fileID2']
    }
  }
})
```

## 通用工具模块

所有云函数都使用以下通用工具模块：

- `common/rateLimit.js` - 请求频率限制
- `common/imageProcessor.js` - 图片处理
- `common/validator.js` - 参数验证
- `common/logger.js` - 日志记录

## 配置说明

每个云函数都有独立的 `config.js` 配置文件，包含：
- API密钥配置（从环境变量读取）
- 业务参数配置
- 功能开关配置

## 部署说明

1. **安装依赖**：在每个云函数目录下运行 `npm install`
2. **配置环境变量**：在小程序后台配置云函数环境变量
3. **上传部署**：使用小程序开发工具上传并部署云函数

## 环境变量配置

需要在云函数环境中配置以下变量：

- `AI_API_TYPE` - AI API类型（openai/baidu等）
- `AI_API_BASE_URL` - AI API基础地址
- `AI_API_KEY` - AI API密钥
- `AI_MODEL` - AI模型名称

## 注意事项

1. **频率限制**：所有云函数都实现了频率限制，避免滥用
2. **错误处理**：所有云函数都有完整的错误处理和日志记录
3. **参数验证**：所有输入参数都经过严格验证
4. **隐私保护**：用户数据通过userId隔离，确保隐私安全
