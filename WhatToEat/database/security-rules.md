# 数据库安全规则配置说明

本文档说明如何在小程序后台配置数据库安全规则。

## 配置方法

1. 登录微信小程序后台
2. 进入「云开发」->「数据库」
3. 选择对应的集合
4. 点击「权限设置」
5. 选择「自定义安全规则」
6. 将对应的规则代码粘贴进去

## 安全规则说明

### 1. food_items（菜品表）

```javascript
{
  "read": "doc.userId == auth.openid && doc.isDeleted == false",
  "write": "doc.userId == auth.openid",
  "create": "request.data.userId == auth.openid && request.data.isDeleted == false",
  "update": "doc.userId == auth.openid",
  "delete": false
}
```

**规则说明：**
- **read**：只能读取自己的、未删除的菜品
- **write**：只能写入自己的数据
- **create**：创建时userId必须等于当前用户openid，且isDeleted必须为false
- **update**：只能更新自己的数据
- **delete**：禁止直接删除（使用软删除）

### 2. users（用户表）

```javascript
{
  "read": "doc._id == auth.openid",
  "write": "doc._id == auth.openid",
  "create": "request.data._id == auth.openid",
  "update": "doc._id == auth.openid && request.data._id == auth.openid",
  "delete": false
}
```

**规则说明：**
- **read**：只能读取自己的用户信息
- **write**：只能写入自己的数据
- **create**：创建时_id必须等于当前用户openid
- **update**：只能更新自己的数据，且不能修改_id
- **delete**：禁止直接删除

### 3. recipes（食谱表）

```javascript
{
  "read": "(doc.userId == auth.openid || doc.isPublic == true) && doc.isDeleted == false",
  "write": "doc.userId == auth.openid",
  "create": "request.data.userId == auth.openid && request.data.isDeleted == false",
  "update": "doc.userId == auth.openid",
  "delete": false
}
```

**规则说明：**
- **read**：可以读取自己的食谱，或公开的、未删除的食谱
- **write**：只能写入自己的数据
- **create**：创建时userId必须等于当前用户openid
- **update**：只能更新自己的数据
- **delete**：禁止直接删除

### 4. community_posts（社区动态表）

```javascript
{
  "read": "doc.isDeleted == false",
  "write": "doc.userId == auth.openid",
  "create": "request.data.userId == auth.openid && request.data.isDeleted == false",
  "update": "doc.userId == auth.openid",
  "delete": false
}
```

**规则说明：**
- **read**：所有人可以读取未删除的动态
- **write**：只能写入自己的数据
- **create**：创建时userId必须等于当前用户openid
- **update**：只能更新自己的数据
- **delete**：禁止直接删除

### 5. health_reports（健康报告表）

```javascript
{
  "read": "doc.userId == auth.openid && doc.isDeleted == false",
  "write": "doc.userId == auth.openid",
  "create": "request.data.userId == auth.openid && request.data.isDeleted == false",
  "update": "doc.userId == auth.openid",
  "delete": false
}
```

**规则说明：**
- **read**：只能读取自己的、未删除的报告
- **write**：只能写入自己的数据
- **create**：创建时userId必须等于当前用户openid
- **update**：只能更新自己的数据
- **delete**：禁止直接删除

## 安全规则变量说明

- `auth.openid`：当前登录用户的openid
- `doc`：数据库中的文档对象
- `request.data`：请求中的数据对象
- `request.query`：查询条件

## 注意事项

1. **软删除**：所有集合都禁止直接删除（`delete: false`），使用软删除机制（设置`isDeleted: true`）
2. **用户隔离**：所有用户数据都通过`userId`或`_id`进行隔离，确保用户只能访问自己的数据
3. **公开数据**：recipes集合支持公开数据，但必须满足`isPublic == true`且`isDeleted == false`
4. **社区数据**：community_posts允许所有人读取，但只能修改自己的数据
5. **数据验证**：创建数据时必须验证`userId`或`_id`等于当前用户

## 测试建议

在配置安全规则后，建议进行以下测试：

1. 测试用户只能读取自己的数据
2. 测试用户不能修改他人的数据
3. 测试软删除功能（isDeleted字段）
4. 测试公开数据的读取权限
5. 测试数据创建时的验证规则
