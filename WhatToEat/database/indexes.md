# 数据库索引优化文档

本文档说明如何创建和优化数据库索引，以提高查询性能。

## 索引创建方法

### 方法1：通过小程序后台创建

1. 登录微信小程序后台
2. 进入「云开发」->「数据库」
3. 选择对应的集合
4. 点击「索引管理」
5. 点击「添加索引」
6. 选择字段和排序方式
7. 点击「创建」

### 方法2：通过云函数创建

使用云函数批量创建索引（推荐用于开发环境）：

```javascript
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();

// 创建索引
async function createIndexes() {
  // food_items 集合索引
  await db.collection('food_items').createIndex({
    name: 'idx_user_deleted_time',
    keys: {
      userId: 1,
      isDeleted: 1,
      createTime: -1
    }
  });

  // ... 其他索引
}
```

## 索引列表

### 1. food_items 集合索引

#### 索引1：用户菜品查询索引
- **名称**：`idx_user_deleted_time`
- **字段**：`userId` (升序) + `isDeleted` (升序) + `createTime` (降序)
- **用途**：查询用户的所有菜品，按创建时间排序
- **查询示例**：
```javascript
db.collection('food_items')
  .where({
    userId: 'xxx',
    isDeleted: false
  })
  .orderBy('createTime', 'desc')
```

#### 索引2：分类查询索引
- **名称**：`idx_category_deleted`
- **字段**：`category` (升序) + `isDeleted` (升序)
- **用途**：按分类查询菜品
- **查询示例**：
```javascript
db.collection('food_items')
  .where({
    category: '蔬菜',
    isDeleted: false
  })
```

#### 索引3：过期提醒索引
- **名称**：`idx_expire_status`
- **字段**：`expireDate` (升序) + `status` (升序)
- **用途**：查询即将过期的菜品
- **查询示例**：
```javascript
db.collection('food_items')
  .where({
    status: 'warning',
    expireDate: db.command.lte(new Date())
  })
```

### 2. users 集合索引

#### 索引1：主键索引（自动创建）
- **名称**：`_id`
- **字段**：`_id`
- **用途**：快速查找用户信息

#### 索引2：创建时间索引
- **名称**：`idx_create_time`
- **字段**：`createTime` (降序)
- **用途**：按注册时间排序
- **查询示例**：
```javascript
db.collection('users')
  .orderBy('createTime', 'desc')
```

### 3. recipes 集合索引

#### 索引1：用户食谱查询索引
- **名称**：`idx_user_deleted_time`
- **字段**：`userId` (升序) + `isDeleted` (升序) + `createTime` (降序)
- **用途**：查询用户的所有食谱
- **查询示例**：
```javascript
db.collection('recipes')
  .where({
    userId: 'xxx',
    isDeleted: false
  })
  .orderBy('createTime', 'desc')
```

#### 索引2：热门食谱索引
- **名称**：`idx_public_deleted_like`
- **字段**：`isPublic` (升序) + `isDeleted` (升序) + `likeCount` (降序)
- **用途**：社区展示热门食谱
- **查询示例**：
```javascript
db.collection('recipes')
  .where({
    isPublic: true,
    isDeleted: false
  })
  .orderBy('likeCount', 'desc')
```

#### 索引3：菜品关联索引
- **名称**：`idx_food_ids`
- **字段**：`foodIds` (数组索引)
- **用途**：根据菜品ID查找相关食谱
- **查询示例**：
```javascript
db.collection('recipes')
  .where({
    foodIds: db.command.in(['foodId1', 'foodId2'])
  })
```

### 4. community_posts 集合索引

#### 索引1：用户动态查询索引
- **名称**：`idx_user_deleted_time`
- **字段**：`userId` (升序) + `isDeleted` (升序) + `createTime` (降序)
- **用途**：查询用户的所有动态
- **查询示例**：
```javascript
db.collection('community_posts')
  .where({
    userId: 'xxx',
    isDeleted: false
  })
  .orderBy('createTime', 'desc')
```

#### 索引2：社区列表索引
- **名称**：`idx_deleted_time`
- **字段**：`isDeleted` (升序) + `createTime` (降序)
- **用途**：查询所有公开动态（社区列表）
- **查询示例**：
```javascript
db.collection('community_posts')
  .where({
    isDeleted: false
  })
  .orderBy('createTime', 'desc')
```

#### 索引3：食谱关联索引
- **名称**：`idx_recipe_id`
- **字段**：`recipeId` (升序)
- **用途**：根据食谱ID查找相关动态
- **查询示例**：
```javascript
db.collection('community_posts')
  .where({
    recipeId: 'xxx'
  })
```

### 5. health_reports 集合索引

#### 索引1：时间段查询索引
- **名称**：`idx_user_date_range`
- **字段**：`userId` (升序) + `startDate` (升序) + `endDate` (升序)
- **用途**：查询用户在特定时间段的报告
- **查询示例**：
```javascript
db.collection('health_reports')
  .where({
    userId: 'xxx',
    startDate: db.command.gte(startDate),
    endDate: db.command.lte(endDate)
  })
```

#### 索引2：用户报告列表索引
- **名称**：`idx_user_deleted_time`
- **字段**：`userId` (升序) + `isDeleted` (升序) + `createTime` (降序)
- **用途**：查询用户的所有报告，按创建时间排序
- **查询示例**：
```javascript
db.collection('health_reports')
  .where({
    userId: 'xxx',
    isDeleted: false
  })
  .orderBy('createTime', 'desc')
```

## 索引优化建议

### 1. 复合索引字段顺序

复合索引的字段顺序很重要，应遵循以下原则：
- **最左前缀原则**：查询条件必须包含索引的最左字段
- **等值查询在前**：等值查询字段放在范围查询字段之前
- **排序字段在后**：排序字段放在最后

**示例**：
```javascript
// 好的索引顺序
userId (等值) + isDeleted (等值) + createTime (范围/排序)

// 查询示例
.where({ userId: 'xxx', isDeleted: false })
.orderBy('createTime', 'desc')
```

### 2. 避免过多索引

- 每个集合的索引数量建议不超过5个
- 索引会占用存储空间，并影响写入性能
- 只创建真正需要的索引

### 3. 定期分析慢查询

- 在小程序后台查看「慢查询日志」
- 分析慢查询的原因
- 为慢查询创建合适的索引

### 4. 索引使用检查

在查询时，确保：
- 查询条件使用了索引字段
- 排序字段在索引中
- 避免在索引字段上使用函数或表达式

**示例**：
```javascript
// ✅ 好的查询（使用索引）
.where({ userId: 'xxx', isDeleted: false })
.orderBy('createTime', 'desc')

// ❌ 不好的查询（无法使用索引）
.where({ userId: 'xxx' })
.orderBy('createTime', 'desc')  // 缺少isDeleted条件

// ❌ 不好的查询（索引字段使用函数）
.where({ userId: 'xxx', createTime: db.command.gte(new Date().getTime()) })
```

## 索引维护

### 1. 监控索引使用情况

定期检查：
- 索引是否被使用
- 索引的查询效率
- 是否需要新增或删除索引

### 2. 重建索引

如果索引损坏或性能下降，可以：
1. 删除旧索引
2. 重新创建索引
3. 等待索引构建完成

### 3. 索引统计

在小程序后台可以查看：
- 索引大小
- 索引使用频率
- 索引查询性能

## 注意事项

1. **索引创建时间**：创建索引需要时间，特别是数据量大的集合
2. **索引维护成本**：索引会增加写入成本，需要权衡
3. **索引数量限制**：每个集合的索引数量有限制（通常为64个）
4. **索引字段类型**：确保索引字段的数据类型一致
5. **数组索引**：数组字段的索引会为每个数组元素创建索引项
