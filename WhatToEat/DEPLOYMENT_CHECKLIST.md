# 家庭菜品管理与智能食谱 - 部署任务清单

本文档提供完整的人工配置部署步骤，按照顺序执行即可完成项目初始配置。

---

## 🚀 快速参考

### 关键链接
- **微信公众平台**：https://mp.weixin.qq.com/
- **云开发控制台**：https://console.cloud.tencent.com/tcb
- **微信开发者工具下载**：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

### 关键配置位置
- **云开发环境ID**：`WhatToEat/config/env.js` → `cloudEnvId`
- **项目配置**：`WhatToEat/project.config.json` → `cloudfunctionRoot`
- **数据库安全规则**：`WhatToEat/database/security-rules.json`

### 一键部署脚本
```powershell
# 部署 common 模块到所有云函数
cd D:\MYSELF\WeChatTool_WhatToEat\WhatToEat
.\deploy-common.ps1
```

### 必须创建的数据库集合
1. `food_items` - 菜品表
2. `users` - 用户表
3. `recipes` - 食谱表
4. `community_posts` - 社区动态表
5. `health_reports` - 健康报告表

### 必须上传的云函数
1. `food-recognition` - 菜品识别
2. `recipe-generate` - 食谱生成
3. `report-generate` - 健康报告
4. `community` - 社区互动
5. `user-login` - 用户登录
6. `image-upload` - 图片上传

---

## 📋 前置准备

### ✅ 任务 1：确认开发工具和账号

**操作步骤：**
1. 下载并安装微信开发者工具
   - 下载地址：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
   - 版本要求：最新稳定版

2. 注册微信小程序账号
   - 注册地址：https://mp.weixin.qq.com/
   - 使用邮箱或微信扫码注册

**验证方法：**
- [ ] 能够成功登录微信开发者工具
- [ ] 能够登录微信公众平台（mp.weixin.qq.com）

**可能遇到的问题：**
- **问题**：开发者工具无法登录
- **解决**：检查网络连接，确认微信账号已绑定小程序

---

## 🔧 第一步：项目基础配置

### ✅ 任务 2：配置项目基本信息

**操作步骤：**
1. 打开微信开发者工具
2. 选择"导入项目"
3. 选择项目目录：`D:\MYSELF\WeChatTool_WhatToEat\WhatToEat`
4. 填写 AppID（从微信公众平台获取）

**获取 AppID：**
- 访问：https://mp.weixin.qq.com/
- 登录后进入：开发 → 开发管理 → 开发设置
- 复制 AppID（格式：wx开头的一串字符）

**验证方法：**
- [ ] 项目能够正常打开
- [ ] 控制台无报错
- [ ] 项目配置中 AppID 已正确填写

**可能遇到的问题：**
- **问题**：提示"AppID 无效"
- **解决**：确认 AppID 已在小程序后台创建，且账号有权限

---

### ✅ 任务 3：配置云函数目录

**操作步骤：**
1. 打开文件：`WhatToEat/project.config.json`
2. 在 `"libVersion": "3.13.1",` 后添加：
   ```json
   "cloudfunctionRoot": "cloudfunctions",
   ```
3. 保存文件
4. 重启微信开发者工具

**验证方法：**
- [ ] 在文件管理器中看到 `cloudfunctions` 目录显示云函数图标（小云朵）
- [ ] 右键点击云函数目录能看到"上传并部署"选项

**可能遇到的问题：**
- **问题**：重启后仍看不到上传选项
- **解决**：
  1. 检查 `project.config.json` 格式是否正确（JSON格式）
  2. 确认 `cloudfunctions` 目录在项目根目录下
  3. 尝试：项目 → 设置 → 本地设置 → 手动指定云函数目录

---

## ☁️ 第二步：云开发环境配置

### ✅ 任务 4：开通云开发服务

**操作步骤：**
1. 在微信开发者工具中，点击工具栏的"云开发"按钮
2. 或访问：https://console.cloud.tencent.com/tcb
3. 点击"开通云开发"
4. 选择套餐（建议选择"按量付费"或"基础版"）
5. 创建环境（环境名称建议：`prod` 或 `dev`）

**操作链接：**
- 云开发控制台：https://console.cloud.tencent.com/tcb
- 微信开发者工具：工具栏 → 云开发

**验证方法：**
- [ ] 能够成功创建云开发环境
- [ ] 能看到环境ID（格式：`env-xxxxx`）
- [ ] 控制台显示环境状态为"正常"

**可能遇到的问题：**
- **问题**：提示"需要实名认证"
- **解决**：前往腾讯云控制台完成实名认证
- **问题**：无法创建环境
- **解决**：检查账号是否已绑定小程序，确认有创建权限

---

### ✅ 任务 5：配置云开发环境ID

**操作步骤：**
1. 在云开发控制台获取环境ID
   - 访问：https://console.cloud.tencent.com/tcb
   - 或：微信开发者工具 → 云开发 → 设置 → 环境设置
   - 复制环境ID（格式：`env-xxxxx`）

2. 打开文件：`WhatToEat/config/env.js`
3. 修改第5行：
   ```javascript
   export const cloudEnvId = 'env-xxxxx'; // 替换为你的环境ID
   ```
4. 保存文件

**验证方法：**
- [ ] `config/env.js` 中的 `cloudEnvId` 已填写
- [ ] 在小程序中调用 `wx.cloud.init()` 不报错
- [ ] 控制台能看到云开发初始化成功的日志

**可能遇到的问题：**
- **问题**：提示"环境不存在"
- **解决**：确认环境ID正确，检查环境是否已创建

---

## 🗄️ 第三步：数据库配置

### ✅ 任务 6：创建数据库集合

**操作步骤：**
1. 打开云开发控制台
   - 访问：https://console.cloud.tencent.com/tcb
   - 或：微信开发者工具 → 云开发 → 数据库

2. 创建以下5个集合（点击"添加集合"）：
   - `food_items` - 菜品表
   - `users` - 用户表
   - `recipes` - 食谱表
   - `community_posts` - 社区动态表
   - `health_reports` - 健康报告表

3. 每个集合创建时选择：
   - 权限设置：选择"自定义安全规则"（稍后配置）

**操作链接：**
- 数据库管理：https://console.cloud.tencent.com/tcb/database

**验证方法：**
- [ ] 5个集合都已创建成功
- [ ] 集合列表中能看到所有集合名称
- [ ] 每个集合的权限显示为"自定义安全规则"

**可能遇到的问题：**
- **问题**：无法创建集合
- **解决**：确认有数据库操作权限，检查环境是否正常

---

### ✅ 任务 7：配置数据库安全规则

**操作步骤：**
1. 打开云开发控制台 → 数据库
2. 对每个集合依次配置安全规则：

   **food_items 集合：**
   - 点击集合名称 → 权限设置 → 自定义安全规则
   - 复制以下规则：
   ```json
   {
     "read": "doc.userId == auth.openid && doc.isDeleted == false",
     "write": "doc.userId == auth.openid",
     "create": "request.data.userId == auth.openid && request.data.isDeleted == false",
     "update": "doc.userId == auth.openid",
     "delete": false
   }
   ```
   - 点击"保存"

   **users 集合：**
   ```json
   {
     "read": "doc._id == auth.openid",
     "write": "doc._id == auth.openid",
     "create": "request.data._id == auth.openid",
     "update": "doc._id == auth.openid && request.data._id == auth.openid",
     "delete": false
   }
   ```

   **recipes 集合：**
   ```json
   {
     "read": "(doc.userId == auth.openid || doc.isPublic == true) && doc.isDeleted == false",
     "write": "doc.userId == auth.openid",
     "create": "request.data.userId == auth.openid && request.data.isDeleted == false",
     "update": "doc.userId == auth.openid",
     "delete": false
   }
   ```

   **community_posts 集合：**
   ```json
   {
     "read": "doc.isDeleted == false",
     "write": "doc.userId == auth.openid",
     "create": "request.data.userId == auth.openid && request.data.isDeleted == false",
     "update": "doc.userId == auth.openid",
     "delete": false
   }
   ```

   **health_reports 集合：**
   ```json
   {
     "read": "doc.userId == auth.openid && doc.isDeleted == false",
     "write": "doc.userId == auth.openid",
     "create": "request.data.userId == auth.openid && request.data.isDeleted == false",
     "update": "doc.userId == auth.openid",
     "delete": false
   }
   ```

**参考文档：**
- 安全规则说明：`WhatToEat/database/security-rules.md`
- JSON格式规则：`WhatToEat/database/security-rules.json`

**验证方法：**
- [ ] 每个集合的安全规则都已保存
- [ ] 规则格式正确（JSON格式）
- [ ] 控制台无语法错误提示

**可能遇到的问题：**
- **问题**：提示"规则格式错误"
- **解决**：检查JSON格式，确保引号、逗号正确
- **问题**：保存后规则不生效
- **解决**：刷新页面，确认规则已保存成功

---

### ✅ 任务 8：创建数据库索引

**操作步骤：**
1. 打开云开发控制台 → 数据库
2. 对每个集合创建索引（点击集合 → 索引管理 → 添加索引）：

   **food_items 集合：**
   - 索引1：`userId`（升序）、`isDeleted`（升序）、`createTime`（降序）
   - 索引2：`userId`（升序）、`status`（升序）
   - 索引3：`userId`（升序）、`category`（升序）

   **users 集合：**
   - 索引1：`_id`（升序）

   **recipes 集合：**
   - 索引1：`userId`（升序）、`isDeleted`（升序）、`createTime`（降序）
   - 索引2：`isPublic`（升序）、`isDeleted`（升序）、`createTime`（降序）

   **community_posts 集合：**
   - 索引1：`isDeleted`（升序）、`createTime`（降序）
   - 索引2：`userId`（升序）、`isDeleted`（升序）

   **health_reports 集合：**
   - 索引1：`userId`（升序）、`isDeleted`（升序）、`createTime`（降序）

**参考文档：**
- 索引说明：`WhatToEat/database/indexes.md`

**验证方法：**
- [ ] 所有索引创建成功
- [ ] 索引列表中能看到创建的索引
- [ ] 查询性能正常（无超时）

**可能遇到的问题：**
- **问题**：提示"索引已存在"
- **解决**：跳过已存在的索引，继续创建其他索引
- **问题**：创建索引失败
- **解决**：检查字段名是否正确，确认字段存在

---

## ⚙️ 第四步：云函数配置

### ✅ 任务 9：上传云函数

**操作步骤：**
1. 在微信开发者工具中，打开 `cloudfunctions` 目录
2. 对以下云函数逐个上传：
   - `food-recognition` - 菜品识别
   - `recipe-generate` - 食谱生成
   - `report-generate` - 健康报告
   - `community` - 社区互动
   - `user-login` - 用户登录
   - `image-upload` - 图片上传

3. 上传方法：
   - 右键点击云函数目录（如 `food-recognition`）
   - 选择"上传并部署：云端安装依赖（不上传node_modules）"
   - 等待上传完成（控制台会显示进度）

**验证方法：**
- [ ] 所有云函数上传成功
- [ ] 云开发控制台 → 云函数中能看到所有函数
- [ ] 每个函数状态显示为"正常"

**可能遇到的问题：**
- **问题**：提示"找不到 common 模块"
- **解决**：需要将 `common` 目录复制到每个云函数目录中，或修改引用路径
- **问题**：上传失败，提示依赖安装错误
- **解决**：
  1. 检查 `package.json` 格式是否正确
  2. 尝试手动安装依赖：在云函数目录下运行 `npm install`
  3. 重新上传

---

### ✅ 任务 10：配置云函数环境变量

**操作步骤：**
1. 打开云开发控制台
   - 访问：https://console.cloud.tencent.com/tcb
   - 或：微信开发者工具 → 云开发 → 云函数 → 环境变量

2. 为每个云函数配置环境变量（点击函数名称 → 配置 → 环境变量）：

   **food-recognition 和 recipe-generate 需要配置：**
   - `AI_API_TYPE` = `openai` 或 `baidu-qianfan` 或 `ali-bailian`
   - `AI_API_BASE_URL` = API基础地址（如：`https://api.openai.com/v1`）
   - `AI_API_KEY` = API密钥
   - `AI_MODEL` = 模型名称（如：`gpt-4-vision-preview`）
   - `BAIDU_CLIENT_ID` = 百度千帆Client ID（如果使用百度）
   - `BAIDU_CLIENT_SECRET` = 百度千帆Client Secret（如果使用百度）
   - `AI_FALLBACK_TYPES` = 降级方案（如：`baidu-qianfan,ali-bailian`）

**获取API密钥：**
- OpenAI：https://platform.openai.com/api-keys
- 百度千帆：https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application
- 阿里百炼：https://dashscope.console.aliyun.com/

**验证方法：**
- [ ] 环境变量已正确配置
- [ ] 调用云函数不报错
- [ ] 云函数日志中能看到正常执行记录

**可能遇到的问题：**
- **问题**：云函数调用失败，提示"API密钥无效"
- **解决**：检查环境变量是否正确配置，确认API密钥有效
- **问题**：找不到环境变量配置入口
- **解决**：在云开发控制台 → 云函数 → 点击函数名称 → 配置标签页

---

### ✅ 任务 11：处理 common 模块依赖

**问题说明：**
云函数需要引用 `common` 目录下的公共模块，但云函数是独立部署的，需要将 `common` 模块复制到每个云函数中，并修改引用路径。

**操作步骤：**

**步骤1：复制 common 目录到每个云函数**

**方法A：使用自动部署脚本（推荐，一键完成）**

1. 打开 PowerShell（以管理员身份运行，如果遇到权限问题）
2. 进入项目目录：
   ```powershell
   cd D:\MYSELF\WeChatTool_WhatToEat\WhatToEat
   ```
3. 执行部署脚本：
   ```powershell
   .\deploy-common.ps1
   ```
   
   脚本会自动：
   - 复制 common 目录到所有云函数
   - 修改所有云函数的引用路径（`../common/` → `./common/`）

**方法B：手动操作（如果脚本执行失败）**

打开命令行（PowerShell），进入项目目录并执行：

```powershell
# 进入项目目录
cd D:\MYSELF\WeChatTool_WhatToEat\WhatToEat

# 复制 common 到各个云函数
Copy-Item -Path "cloudfunctions\common" -Destination "cloudfunctions\food-recognition\common" -Recurse
Copy-Item -Path "cloudfunctions\common" -Destination "cloudfunctions\recipe-generate\common" -Recurse
Copy-Item -Path "cloudfunctions\common" -Destination "cloudfunctions\report-generate\common" -Recurse
Copy-Item -Path "cloudfunctions\common" -Destination "cloudfunctions\community\common" -Recurse
Copy-Item -Path "cloudfunctions\common" -Destination "cloudfunctions\user-login\common" -Recurse
Copy-Item -Path "cloudfunctions\common" -Destination "cloudfunctions\image-upload\common" -Recurse
```

**步骤2：修改云函数中的引用路径（如果使用方法B）**

需要修改以下文件的引用路径（将 `../common/` 改为 `./common/`）：

1. **food-recognition/index.js**：
   - 将 `require('../common/xxx')` 改为 `require('./common/xxx')`

2. **recipe-generate/index.js**：
   - 将 `require('../common/xxx')` 改为 `require('./common/xxx')`

3. **report-generate/index.js**：
   - 将 `require('../common/xxx')` 改为 `require('./common/xxx')`

4. **community/index.js**：
   - 将 `require('../common/xxx')` 改为 `require('./common/xxx')`

5. **user-login/index.js**：
   - 将 `require('../common/xxx')` 改为 `require('./common/xxx')`

6. **image-upload/index.js**：
   - 将 `require('../common/xxx')` 改为 `require('./common/xxx')`

**批量替换方法（使用VS Code）：**
1. 打开VS Code
2. 按 `Ctrl+Shift+H` 打开查找替换
3. 查找：`require\('../common/`
4. 替换为：`require('./common/`
5. 在"文件"中限制范围：`cloudfunctions/**/*.js`
6. 点击"全部替换"

**验证方法：**
- [ ] 每个云函数目录下都有 `common` 文件夹
- [ ] 所有 `require('../common/` 已改为 `require('./common/`
- [ ] 云函数上传后能正常执行
- [ ] 控制台无"找不到模块"错误

**可能遇到的问题：**
- **问题**：复制后云函数仍报错"找不到模块"
- **解决**：
  1. 确认引用路径已从 `../common/` 改为 `./common/`
  2. 检查 `common` 目录是否完整（应包含所有.js文件）
  3. 确认文件路径大小写正确

---

## 🔐 第五步：权限配置

### ✅ 任务 12：配置小程序权限

**操作步骤：**
1. 登录微信公众平台
   - 访问：https://mp.weixin.qq.com/
   - 登录小程序账号

2. 配置接口权限
   - 进入：开发 → 开发管理 → 接口设置
   - 开启以下接口：
     - 用户信息（getUserProfile）
     - 相机（camera）
     - 相册（album）
     - 位置（getLocation，可选）

**操作链接：**
- 接口设置：https://mp.weixin.qq.com/wxopen/devprofile?action=get_profile&token=&lang=zh_CN

**验证方法：**
- [ ] 所有需要的接口都已开启
- [ ] 接口状态显示为"已开启"

**可能遇到的问题：**
- **问题**：接口无法开启
- **解决**：某些接口需要小程序认证后才能开启，或需要填写使用说明

---

### ✅ 任务 13：配置服务器域名（如需要）

**操作步骤：**
1. 登录微信公众平台
2. 进入：开发 → 开发管理 → 开发设置 → 服务器域名
3. 配置以下域名（如果使用外部API）：
   - request合法域名：添加AI API域名
   - uploadFile合法域名：添加图片上传域名
   - downloadFile合法域名：添加文件下载域名

**操作链接：**
- 服务器域名配置：https://mp.weixin.qq.com/wxopen/devprofile?action=get_profile&token=&lang=zh_CN

**验证方法：**
- [ ] 域名配置已保存
- [ ] 小程序能正常调用外部API

**可能遇到的问题：**
- **问题**：提示"域名格式错误"
- **解决**：确保域名格式正确，包含协议（https://）
- **问题**：提示"需要ICP备案"
- **解决**：使用已备案的域名，或使用云函数代理

---

## 🧪 第六步：功能验证

### ✅ 任务 14：验证云开发初始化

**操作步骤：**
1. 在微信开发者工具中编译项目
2. 打开调试器 → Console
3. 查看是否有云开发初始化成功的日志

**验证命令（在Console中执行）：**
```javascript
// 测试云开发连接
wx.cloud.database().collection('users').count().then(res => {
  console.log('数据库连接成功', res);
}).catch(err => {
  console.error('数据库连接失败', err);
});
```

**验证方法：**
- [ ] 控制台显示"数据库连接成功"
- [ ] 无错误信息

**可能遇到的问题：**
- **问题**：提示"环境不存在"
- **解决**：检查 `config/env.js` 中的环境ID是否正确

---

### ✅ 任务 15：验证云函数调用

**操作步骤：**
1. 在微信开发者工具中编译项目
2. 打开调试器 → Console
3. 测试云函数调用：

```javascript
// 测试用户登录云函数
wx.cloud.callFunction({
  name: 'user-login',
  data: {
    action: 'get'
  }
}).then(res => {
  console.log('云函数调用成功', res);
}).catch(err => {
  console.error('云函数调用失败', err);
});
```

**验证方法：**
- [ ] 云函数调用成功
- [ ] 返回数据格式正确
- [ ] 无错误信息

**可能遇到的问题：**
- **问题**：提示"云函数不存在"
- **解决**：确认云函数已上传，检查函数名称是否正确
- **问题**：提示"权限不足"
- **解决**：检查数据库安全规则配置

---

### ✅ 任务 16：验证数据库操作

**操作步骤：**
1. 在Console中执行：

```javascript
// 测试数据库写入
wx.cloud.database().collection('users').add({
  data: {
    _id: 'test_user',
    nickName: '测试用户',
    createTime: new Date(),
    isDeleted: false
  }
}).then(res => {
  console.log('数据库写入成功', res);
  
  // 测试数据库读取
  return wx.cloud.database().collection('users').doc('test_user').get();
}).then(res => {
  console.log('数据库读取成功', res);
}).catch(err => {
  console.error('数据库操作失败', err);
});
```

**验证方法：**
- [ ] 数据库写入成功
- [ ] 数据库读取成功
- [ ] 数据格式正确

**可能遇到的问题：**
- **问题**：提示"权限不足"
- **解决**：检查数据库安全规则，确认规则允许当前用户操作
- **问题**：提示"集合不存在"
- **解决**：确认集合已创建，检查集合名称是否正确

---

## 📝 第七步：最终检查清单

### ✅ 完整验证清单

**项目配置：**
- [ ] `project.config.json` 中已配置 `cloudfunctionRoot`
- [ ] `config/env.js` 中已填写云开发环境ID
- [ ] AppID 已正确配置

**云开发：**
- [ ] 云开发环境已创建
- [ ] 环境状态正常

**数据库：**
- [ ] 5个集合已创建（food_items, users, recipes, community_posts, health_reports）
- [ ] 所有集合的安全规则已配置
- [ ] 必要的索引已创建

**云函数：**
- [ ] 6个云函数已上传（food-recognition, recipe-generate, report-generate, community, user-login, image-upload）
- [ ] 云函数环境变量已配置（AI API相关）
- [ ] common 模块已复制到各云函数

**权限：**
- [ ] 小程序接口权限已开启
- [ ] 服务器域名已配置（如需要）

**功能验证：**
- [ ] 云开发初始化成功
- [ ] 云函数调用成功
- [ ] 数据库操作成功

---

## 🚨 常见问题汇总

### 问题1：云函数上传后无法调用

**可能原因：**
- 环境变量未配置
- common 模块未复制
- 函数代码有语法错误

**解决方法：**
1. 检查云函数日志（云开发控制台 → 云函数 → 日志）
2. 确认环境变量已配置
3. 检查代码语法

### 问题2：数据库操作权限不足

**可能原因：**
- 安全规则配置错误
- 用户未登录
- 数据格式不符合规则

**解决方法：**
1. 检查安全规则配置
2. 确认用户已登录（有 openid）
3. 检查数据格式

### 问题3：AI API调用失败

**可能原因：**
- API密钥无效
- 网络问题
- API配额用完

**解决方法：**
1. 检查环境变量中的API密钥
2. 测试API密钥是否有效
3. 检查API配额

---

## 📞 获取帮助

- 微信小程序官方文档：https://developers.weixin.qq.com/miniprogram/dev/framework/
- 云开发文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html
- 问题反馈：微信开发者工具 → 帮助 → 反馈问题

---

**部署完成后，请按照验证清单逐项检查，确保所有功能正常！**
