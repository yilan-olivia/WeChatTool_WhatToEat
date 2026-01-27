# 过期提醒云函数

## 功能说明

检查用户即将过期的菜品并发送微信订阅消息提醒。

## 配置步骤

### 1. 配置模板ID

在 `config/env.js` 中填写订阅消息模板ID：

```javascript
export const subscribeMessageTemplates = {
  expireReminder: '你的模板ID', // 从微信公众平台获取
};
```

### 2. 订阅消息模板字段

模板需要包含以下字段（根据实际模板调整字段名）：

- `thing1`: 菜品名称（最多20个字符）
- `time2`: 过期时间（格式：YYYY年MM月DD日）
- `thing3`: 提醒内容（如：共有X个菜品即将过期）

### 3. 配置定时触发器

在微信开发者工具中：

1. 右键 `expire-reminder` 云函数文件夹
2. 选择"上传触发器"
3. 配置定时任务（建议每天上午9点执行）

或者手动在云开发控制台配置：
- 触发器名称：`dailyExpireCheck`
- 触发类型：定时触发器
- 触发周期：每天 09:00

### 4. 部署云函数

```bash
# 在微信开发者工具中
右键 expire-reminder 文件夹 -> 上传并部署：云端安装依赖
```

## 调用方式

### 方式1：定时任务自动调用

配置定时触发器后，系统会自动调用：

```javascript
// 云函数会自动执行，检查所有用户
```

### 方式2：手动调用（测试用）

```javascript
// 检查当前用户
wx.cloud.callFunction({
  name: 'expire-reminder',
  data: {
    action: 'checkAndSend',
    templateId: '你的模板ID', // 可选，如果不传则使用默认配置
  },
});

// 检查所有用户（需要管理员权限）
wx.cloud.callFunction({
  name: 'expire-reminder',
  data: {
    action: 'checkAllUsers',
    templateId: '你的模板ID',
  },
});
```

## 注意事项

1. **用户授权**：用户需要在设置页面授权订阅消息才能接收提醒
2. **模板ID**：确保模板ID已正确配置
3. **字段匹配**：确保消息数据字段与模板字段匹配
4. **频率限制**：微信对订阅消息有频率限制，避免频繁发送

## 测试

1. 在设置页面开启过期提醒
2. 添加一个即将过期的菜品（保质期设置为明天或3天后）
3. 手动调用云函数测试：
   ```javascript
   wx.cloud.callFunction({
     name: 'expire-reminder',
     data: {
       action: 'checkAndSend',
       templateId: '你的模板ID',
     },
   });
   ```
