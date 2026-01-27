# 上传代码到 GitHub 操作指南

## 方法一：使用 Git Bash（推荐）

1. **打开 Git Bash**
   - 在项目文件夹 `WeChatTool_WhatToEat` 右键
   - 选择 "Git Bash Here"

2. **执行以下命令**：

```bash
# 1. 添加所有文件
git add .

# 2. 提交更改
git commit -m "feat: 完善菜品管理功能，添加过期提醒功能"

# 3. 推送到 GitHub
git push origin main
```

## 方法二：使用微信开发者工具内置终端

1. 在微信开发者工具中，点击底部 "终端" 标签
2. 执行以下命令：

```bash
git add .
git commit -m "feat: 完善菜品管理功能，添加过期提醒功能"
git push origin main
```

## 方法三：使用 VS Code 或 Cursor 终端

1. 在 Cursor 中按 `` Ctrl + ` `` 打开终端
2. 执行以下命令：

```bash
cd "c:\Users\李子璇\WeChatProjects\WeChatTool_WhatToEat"
git add .
git commit -m "feat: 完善菜品管理功能，添加过期提醒功能"
git push origin main
```

## 如果遇到问题

### 问题1：需要配置用户名和邮箱
```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

### 问题2：需要输入 GitHub 用户名和密码
- 如果使用 HTTPS，可能需要 Personal Access Token
- 建议使用 SSH 方式（更安全）

### 问题3：远程仓库不存在
```bash
# 先创建 GitHub 仓库，然后执行：
git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git push -u origin main
```

## 提交信息规范

- `feat: 新功能`
- `fix: 修复bug`
- `docs: 文档更新`
- `style: 代码格式`
- `refactor: 重构`
- `test: 测试相关`
- `chore: 构建/工具相关`
