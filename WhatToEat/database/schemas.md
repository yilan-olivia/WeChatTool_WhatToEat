# 数据库集合结构定义文档

本文档定义了「家庭菜品管理与智能食谱」小程序的所有数据库集合结构。

## 1. food_items 集合（菜品表）

### 字段定义

| 字段名 | 类型 | 必填 | 默认值 | 说明 | 索引 |
|--------|------|------|--------|------|------|
| _id | String | 是 | 自动生成 | 文档ID | 主键 |
| name | String | 是 | - | 菜品名称 | - |
| category | String | 否 | '其他' | 分类：蔬菜/水果/肉类/海鲜/调料/其他 | 复合索引 |
| image | String | 否 | - | 图片云存储路径（fileID） | - |
| expireDate | Date | 否 | - | 保质期 | 复合索引 |
| status | String | 否 | 'fresh' | 状态：fresh(新鲜)/warning(即将过期)/expired(已过期) | 复合索引 |
| remark | String | 否 | '' | 备注信息 | - |
| userId | String | 是 | - | 用户ID（openid） | 复合索引 |
| isDeleted | Boolean | 是 | false | 软删除标记 | 复合索引 |
| createTime | Date | 是 | 服务器时间 | 创建时间 | 复合索引 |
| updateTime | Date | 是 | 服务器时间 | 更新时间 | - |

### 索引配置

1. **复合索引1**：`userId` + `isDeleted` + `createTime` (降序)
   - 用途：查询用户的所有菜品，按创建时间排序
   - 查询示例：`db.collection('food_items').where({ userId: 'xxx', isDeleted: false }).orderBy('createTime', 'desc')`

2. **复合索引2**：`category` + `isDeleted`
   - 用途：按分类查询菜品
   - 查询示例：`db.collection('food_items').where({ category: '蔬菜', isDeleted: false })`

3. **复合索引3**：`expireDate` + `status`
   - 用途：查询即将过期的菜品
   - 查询示例：`db.collection('food_items').where({ status: 'warning', expireDate: db.command.lte(new Date()) })`

### 数据验证规则

```javascript
{
  name: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 50
  },
  category: {
    type: 'string',
    enum: ['蔬菜', '水果', '肉类', '海鲜', '调料', '其他']
  },
  status: {
    type: 'string',
    enum: ['fresh', 'warning', 'expired']
  },
  userId: {
    type: 'string',
    required: true
  },
  isDeleted: {
    type: 'boolean',
    default: false
  }
}
```

---

## 2. users 集合（用户表）

### 字段定义

| 字段名 | 类型 | 必填 | 默认值 | 说明 | 索引 |
|--------|------|------|--------|------|------|
| _id | String | 是 | openid | 用户ID（openid） | 主键 |
| nickName | String | 否 | - | 用户昵称 | - |
| avatarUrl | String | 否 | - | 头像URL | - |
| gender | Number | 否 | 0 | 性别：0未知/1男/2女 | - |
| country | String | 否 | - | 国家 | - |
| province | String | 否 | - | 省份 | - |
| city | String | 否 | - | 城市 | - |
| language | String | 否 | 'zh_CN' | 语言 | - |
| settings | Object | 否 | {} | 用户设置（通知、隐私等） | - |
| statistics | Object | 否 | {} | 统计数据（菜品数、食谱数等） | - |
| isDeleted | Boolean | 是 | false | 软删除标记 | - |
| createTime | Date | 是 | 服务器时间 | 创建时间 | 单字段索引 |
| updateTime | Date | 是 | 服务器时间 | 更新时间 | - |
| lastLoginTime | Date | 否 | - | 最后登录时间 | - |

### settings 对象结构

```javascript
{
  notifications: {
    expireReminder: true,    // 过期提醒
    recipeRecommend: true,   // 食谱推荐
    communityUpdate: false   // 社区更新
  },
  privacy: {
    showProfile: true,       // 显示个人资料
    showStatistics: false   // 显示统计数据
  }
}
```

### statistics 对象结构

```javascript
{
  totalFoods: 0,           // 菜品总数
  totalRecipes: 0,         // 食谱总数
  totalReports: 0,          // 报告总数
  lastActiveDate: null     // 最后活跃日期
}
```

### 索引配置

1. **主键索引**：`_id` (openid)
   - 用途：快速查找用户信息

2. **单字段索引**：`createTime` (降序)
   - 用途：按注册时间排序

### 数据验证规则

```javascript
{
  _id: {
    type: 'string',
    required: true
  },
  gender: {
    type: 'number',
    enum: [0, 1, 2]
  },
  isDeleted: {
    type: 'boolean',
    default: false
  }
}
```

---

## 3. recipes 集合（食谱表）

### 字段定义

| 字段名 | 类型 | 必填 | 默认值 | 说明 | 索引 |
|--------|------|------|--------|------|------|
| _id | String | 是 | 自动生成 | 文档ID | 主键 |
| name | String | 是 | - | 食谱名称 | - |
| difficulty | String | 否 | '简单' | 难度：简单/中等/困难 | - |
| time | String | 否 | - | 制作时间（如"30分钟"） | - |
| calories | Number | 否 | 0 | 热量（卡路里） | - |
| protein | Number | 否 | 0 | 蛋白质（克） | - |
| fat | Number | 否 | 0 | 脂肪（克） | - |
| carbs | Number | 否 | 0 | 碳水化合物（克） | - |
| ingredients | Array | 是 | [] | 食材列表 | - |
| steps | Array | 是 | [] | 制作步骤 | - |
| images | Array | 否 | [] | 图片列表（fileID数组） | - |
| userId | String | 是 | - | 用户ID | 复合索引 |
| foodIds | Array | 否 | [] | 关联的菜品ID列表 | 数组索引 |
| preference | String | 否 | - | 口味偏好 | - |
| likeCount | Number | 是 | 0 | 点赞数 | 复合索引 |
| viewCount | Number | 是 | 0 | 浏览次数 | - |
| isPublic | Boolean | 是 | false | 是否公开 | 复合索引 |
| isDeleted | Boolean | 是 | false | 软删除标记 | 复合索引 |
| createTime | Date | 是 | 服务器时间 | 创建时间 | 复合索引 |
| updateTime | Date | 是 | 服务器时间 | 更新时间 | - |

### ingredients 数组结构

```javascript
[
  {
    name: "西红柿",
    amount: "2个",
    unit: "个"
  }
]
```

### steps 数组结构

```javascript
[
  {
    step: 1,
    description: "将西红柿洗净切块",
    image: "fileID" // 可选
  }
]
```

### 索引配置

1. **复合索引1**：`userId` + `isDeleted` + `createTime` (降序)
   - 用途：查询用户的所有食谱
   - 查询示例：`db.collection('recipes').where({ userId: 'xxx', isDeleted: false }).orderBy('createTime', 'desc')`

2. **复合索引2**：`isPublic` + `isDeleted` + `likeCount` (降序)
   - 用途：社区展示热门食谱
   - 查询示例：`db.collection('recipes').where({ isPublic: true, isDeleted: false }).orderBy('likeCount', 'desc')`

3. **数组索引**：`foodIds`
   - 用途：根据菜品ID查找相关食谱
   - 查询示例：`db.collection('recipes').where({ foodIds: db.command.in(['foodId1', 'foodId2']) })`

### 数据验证规则

```javascript
{
  name: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100
  },
  difficulty: {
    type: 'string',
    enum: ['简单', '中等', '困难']
  },
  ingredients: {
    type: 'array',
    required: true,
    minLength: 1
  },
  steps: {
    type: 'array',
    required: true,
    minLength: 1
  },
  userId: {
    type: 'string',
    required: true
  },
  isPublic: {
    type: 'boolean',
    default: false
  },
  isDeleted: {
    type: 'boolean',
    default: false
  }
}
```

---

## 4. community_posts 集合（社区动态表）

### 字段定义

| 字段名 | 类型 | 必填 | 默认值 | 说明 | 索引 |
|--------|------|------|--------|------|------|
| _id | String | 是 | 自动生成 | 文档ID | 主键 |
| userId | String | 是 | - | 用户ID | 复合索引 |
| userName | String | 是 | - | 用户昵称（冗余字段） | - |
| userAvatar | String | 否 | - | 用户头像（冗余字段） | - |
| content | String | 是 | - | 动态内容 | - |
| images | Array | 否 | [] | 图片列表（fileID数组） | - |
| recipeId | String | 否 | - | 关联的食谱ID | 单字段索引 |
| likeCount | Number | 是 | 0 | 点赞数 | - |
| commentCount | Number | 是 | 0 | 评论数 | - |
| likeUsers | Array | 是 | [] | 点赞用户ID列表 | - |
| isDeleted | Boolean | 是 | false | 软删除标记 | 复合索引 |
| createTime | Date | 是 | 服务器时间 | 创建时间 | 复合索引 |
| updateTime | Date | 是 | 服务器时间 | 更新时间 | - |

### 索引配置

1. **复合索引1**：`userId` + `isDeleted` + `createTime` (降序)
   - 用途：查询用户的所有动态
   - 查询示例：`db.collection('community_posts').where({ userId: 'xxx', isDeleted: false }).orderBy('createTime', 'desc')`

2. **复合索引2**：`isDeleted` + `createTime` (降序)
   - 用途：查询所有公开动态（社区列表）
   - 查询示例：`db.collection('community_posts').where({ isDeleted: false }).orderBy('createTime', 'desc')`

3. **单字段索引**：`recipeId`
   - 用途：根据食谱ID查找相关动态
   - 查询示例：`db.collection('community_posts').where({ recipeId: 'xxx' })`

### 数据验证规则

```javascript
{
  userId: {
    type: 'string',
    required: true
  },
  userName: {
    type: 'string',
    required: true,
    maxLength: 50
  },
  content: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 1000
  },
  isDeleted: {
    type: 'boolean',
    default: false
  }
}
```

---

## 5. health_reports 集合（健康报告表）

### 字段定义

| 字段名 | 类型 | 必填 | 默认值 | 说明 | 索引 |
|--------|------|------|--------|------|------|
| _id | String | 是 | 自动生成 | 文档ID | 主键 |
| userId | String | 是 | - | 用户ID | 复合索引 |
| startDate | Date | 是 | - | 报告开始日期 | 复合索引 |
| endDate | Date | 是 | - | 报告结束日期 | 复合索引 |
| totalFoods | Number | 是 | 0 | 菜品总数 | - |
| totalRecipes | Number | 是 | 0 | 食谱总数 | - |
| avgCalories | Number | 是 | 0 | 平均热量 | - |
| categoryStats | Array | 是 | [] | 分类统计 | - |
| wasteCount | Number | 是 | 0 | 浪费数量 | - |
| tips | Array | 是 | [] | 健康建议 | - |
| isDeleted | Boolean | 是 | false | 软删除标记 | 复合索引 |
| createTime | Date | 是 | 服务器时间 | 创建时间 | 复合索引 |
| updateTime | Date | 是 | 服务器时间 | 更新时间 | - |

### categoryStats 数组结构

```javascript
[
  {
    category: "蔬菜",
    count: 10,
    percentage: 40.0
  }
]
```

### tips 数组结构

```javascript
[
  "建议增加菜品多样性，保证营养均衡",
  "本周有2个菜品过期，建议合理规划采购"
]
```

### 索引配置

1. **复合索引1**：`userId` + `startDate` + `endDate`
   - 用途：查询用户在特定时间段的报告
   - 查询示例：`db.collection('health_reports').where({ userId: 'xxx', startDate: db.command.gte(start), endDate: db.command.lte(end) })`

2. **复合索引2**：`userId` + `isDeleted` + `createTime` (降序)
   - 用途：查询用户的所有报告，按创建时间排序
   - 查询示例：`db.collection('health_reports').where({ userId: 'xxx', isDeleted: false }).orderBy('createTime', 'desc')`

### 数据验证规则

```javascript
{
  userId: {
    type: 'string',
    required: true
  },
  startDate: {
    type: 'date',
    required: true
  },
  endDate: {
    type: 'date',
    required: true
  },
  totalFoods: {
    type: 'number',
    min: 0
  },
  totalRecipes: {
    type: 'number',
    min: 0
  },
  isDeleted: {
    type: 'boolean',
    default: false
  }
}
```

---

## 通用字段说明

### 软删除机制

所有集合都包含 `isDeleted` 字段，用于实现软删除：
- 默认值：`false`
- 删除操作：将 `isDeleted` 设置为 `true`，而不是真正删除文档
- 查询时：需要添加条件 `isDeleted: false` 来过滤已删除的数据

### 时间字段

- `createTime`：使用 `db.serverDate()` 自动设置，记录创建时间
- `updateTime`：使用 `db.serverDate()` 自动更新，记录最后修改时间

### 用户ID字段

- 所有需要关联用户的集合都包含 `userId` 字段
- `userId` 的值是微信用户的 `openid`
- 通过 `cloud.getWXContext().OPENID` 获取

---

## 数据关系图

```
users (用户)
  ├── food_items (菜品) - 一对多
  ├── recipes (食谱) - 一对多
  ├── community_posts (社区动态) - 一对多
  └── health_reports (健康报告) - 一对多

recipes (食谱)
  └── community_posts (社区动态) - 一对多（可选关联）

food_items (菜品)
  └── recipes (食谱) - 多对多（通过foodIds数组）
```
