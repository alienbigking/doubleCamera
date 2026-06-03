# "还在吗 / Still Here" 开发计划

## 📋 项目概述

### 产品定位

一款以 **情绪打卡 + 低社交 + 安全陪伴** 为核心的轻量级应用。当用户长时间沉默、消失或低能量时，系统以克制、非打扰的方式确认其"仍然存在"。

### 核心价值

- 不解决问题
- 不制造焦虑
- 只做三件事：**记录、共鸣、确认存在**

### 目标用户

- 18–35 岁
- 长期处于工作/生活压力下
- 不愿频繁社交，但希望被理解
- 对"丧文化 / 情绪表达 / 轻社交"有天然接受度

---

## 🏗️ 技术架构

### 基于现有三 Tab 结构

```
🏠 主页: 情绪打卡 + 共时性展示 + 同步设置
🌟 社区: 共鸣空间 + 非点赞互动 + 手动发帖
👤 我的: 人格档案 + 情绪统计 + 隐私设置
```

### 技术栈

- React Native + TypeScript
- Zustand (状态管理)
- React Navigation (导航)
- Toastify (通知)

---

## 📊 数据模型设计

### 核心类型定义

```typescript
// 情绪类型
type MoodType = 'fine' | 'struggling' | 'bad' | 'undefined'

// 情绪映射
const MOOD_CONFIG = {
  fine: { emoji: '🟢', text: '还行' },
  struggling: { emoji: '🟡', text: '勉强' },
  bad: { emoji: '🔴', text: '不太好' },
  undefined: { emoji: '⚪', text: '不想定义' },
}

// 主页状态
interface HomeStoreState {
  todayCheckedIn: boolean
  currentMood: MoodType | null
  checkInStreak: number
  sameMoodCount: number
  syncToCommunity: boolean // 同步到社区开关

  // Actions
  checkIn: (mood: MoodType) => void
  toggleSyncToCommunity: () => void
  getSameMoodCount: (mood: MoodType) => number
  resetDaily: () => void
}

// 社区状态
interface CommunityStoreState {
  posts: CommunityPost[]
  loading: boolean

  // Actions
  loadPosts: () => void
  createPost: (content: string, mood?: MoodType) => void
  interact: (postId: string, type: InteractionType) => void
  createCheckInPost: (mood: MoodType) => void
}

interface CommunityPost {
  id: string
  content: string
  mood?: MoodType
  timestamp: number
  interactions: {
    same: number // 🤝 我也是
    hug: number // 🫂 抱一下
    lieDown: number // 🪦 一起躺
  }
  isFromCheckIn: boolean // 是否来自打卡同步
  isAnonymous: boolean
}

// 我的页面状态
interface ProfileStoreState {
  personalityType: string
  moodStats: Record<MoodType, number>
  privacy: PrivacySettings

  // Actions
  analyzePersonality: () => void
  updatePrivacy: (settings: Partial<PrivacySettings>) => void
  getMoodHistory: () => MoodHistory
}

interface PrivacySettings {
  allowInteraction: boolean
  syncToCommunity: boolean
}
```

---

## 🎯 功能详细设计

### 🏠 主页功能

#### 核心功能

- **情绪打卡**: 每日一次情绪状态记录
- **共时性展示**: "此刻全国有 X 人和你一样"
- **同步设置**: 用户可选择是否同步到社区
- **连续统计**: 显示连续打卡天数

#### UI 组件设计

```typescript
// 主页布局结构
<View style={styles.container}>
  <GreetingCard title="今天还好吗？" />

  {!todayCheckedIn ? (
    <CheckInSection>
      <MoodSelector onSelect={checkIn} />
      <CheckInButton onPress={() => checkIn(selectedMood)} />
    </CheckInSection>
  ) : (
    <CurrentMoodDisplay mood={currentMood} />
  )}

  <SameMoodCount count={sameMoodCount} mood={currentMood} />
  <StreakDisplay days={checkInStreak} />
  <SyncToggle enabled={syncToCommunity} onToggle={toggleSyncToCommunity} />
</View>
```

#### 情绪选择器

- 4 种情绪状态：🟢 还行、🟡 勉强、🔴 不太好、⚪ 不想定义
- 点击选择，确认打卡
- 选择后显示对应 emoji 和文字

---

### 🌟 社区功能

#### 核心功能

- **自动同步**: 打卡内容可自动同步到社区
- **手动发帖**: 120 字限制的简短表达
- **非点赞互动**: 🤝 我也是、🫂 抱一下、🪦 一起躺
- **匿名模式**: 默认匿名，可切换

#### 内容来源

1. 用户打卡自动同步的帖子
2. 系统生成的情绪状态卡片
3. 用户手动发布的小帖子

#### 互动设计

- 取消传统"点赞"机制
- 强调共鸣而非评价
- 降低社交压力

---

### 👤 我的页面功能

#### 核心功能

- **人格档案**: 基于行为数据的情绪人格分析
- **情绪统计**: 近期情绪状态分布
- **隐私设置**: 控制同步和互动权限
- **历史记录**: 打卡历史查看

#### 人格类型设计

```typescript
const PERSONALITY_TYPES = {
  highFunctionLowBattery: {
    name: '高功能低电量型',
    description: '能完成任务，很少缺席，内心长期疲惫',
    conditions: { struggling: 0.6, fine: 0.3, bad: 0.1 },
  },
  emotionallySensitive: {
    name: '情绪敏感型',
    description: '感受力强，容易受外界影响',
    conditions: { bad: 0.5, struggling: 0.3, fine: 0.2 },
  },
  introvertedObserver: {
    name: '内敛观察型',
    description: '喜欢观察，不愿定义自己',
    conditions: { undefined: 0.4, fine: 0.3, struggling: 0.3 },
  },
  stableBalancer: {
    name: '稳定平衡型',
    description: '情绪相对稳定，应对得当',
    conditions: { fine: 0.5, struggling: 0.3, bad: 0.2 },
  },
}
```

---

## ⏱️ 开发计划 (3 周)

### Week 1: 主页核心功能

#### Day 1-2: 数据层搭建

- [ ] 更新 `homeTypes.ts` - 添加情绪类型和状态接口
- [ ] 更新 `homeStore.ts` - 实现打卡逻辑和同步设置
- [ ] 创建情绪配置和工具函数
- [ ] 实现模拟数据生成逻辑

#### Day 3-4: UI 组件开发

- [ ] 创建 `MoodSelector` 组件 - 情绪选择器
- [ ] 创建 `CheckInButton` 组件 - 打卡按钮
- [ ] 创建 `CurrentMoodDisplay` 组件 - 当前状态展示
- [ ] 创建 `SyncToggle` 组件 - 同步开关
- [ ] 创建 `SameMoodCount` 组件 - 共时性展示

#### Day 5: 主页集成

- [ ] 更新 `Home.tsx` - 集成所有组件
- [ ] 实现打卡完整流程
- [ ] 添加状态转换动画
- [ ] 测试主页功能完整性

---

### Week 2: 社区功能

#### Day 1-2: 社区数据层

- [ ] 更新 `communityTypes.ts` - 添加帖子数据模型
- [ ] 更新 `communityStore.ts` - 实现帖子管理和互动
- [ ] 实现 `createCheckInPost` 方法
- [ ] 设计帖子数据结构

#### Day 3-4: 社区 UI 组件

- [ ] 创建 `PostList` 组件 - 帖子列表
- [ ] 创建 `CreatePostInput` 组件 - 发帖输入框
- [ ] 创建 `InteractionButtons` 组件 - 非点赞互动
- [ ] 创建 `PostItem` 组件 - 单个帖子展示
- [ ] 创建 `AnonymousToggle` 组件 - 匿名切换

#### Day 5: 社区集成

- [ ] 更新 `Community.tsx` - 集成所有组件
- [ ] 实现打卡同步到社区逻辑
- [ ] 添加帖子时间排序
- [ ] 测试社区完整功能

---

### Week 3: 我的页面 + 完整联调

#### Day 1-2: 个人数据层

- [ ] 更新 `profileTypes.ts` - 添加人格类型和统计接口
- [ ] 更新 `profileStore.ts` - 实现人格分析和隐私管理
- [ ] 实现人格分析算法
- [ ] 设计情绪统计逻辑

#### Day 3-4: 个人 UI 组件

- [ ] 创建 `PersonalityCard` 组件 - 人格档案卡片
- [ ] 创建 `MoodStatsChart` 组件 - 情绪统计图表
- [ ] 创建 `PrivacySettings` 组件 - 隐私设置页面
- [ ] 创建 `StreakDisplay` 组件 - 连续打卡展示
- [ ] 创建 `HistoryTimeline` 组件 - 历史记录时间轴

#### Day 5: 完整联调

- [ ] 三个 Tab 数据联动测试
- [ ] 同步设置联动测试
- [ ] 用户体验优化
- [ ] Bug 修复和性能优化
- [ ] 完整功能测试

---

## 🔧 关键功能实现

### 打卡同步逻辑

```typescript
// homeStore.ts
const checkIn = (mood: MoodType) => {
  const state = get()

  // 更新主页状态
  set({
    todayCheckedIn: true,
    currentMood: mood,
    checkInStreak: state.checkInStreak + 1,
    sameMoodCount: generateSameMoodCount(mood),
  })

  // 如果开启同步，创建社区帖子
  if (state.syncToCommunity) {
    communityStore.createCheckInPost(mood)
  }
}

// 生成模拟共时性数据
const generateSameMoodCount = (mood: MoodType) => {
  const baseCounts = {
    fine: 2000 + Math.floor(Math.random() * 3000),
    struggling: 3000 + Math.floor(Math.random() * 4000),
    bad: 1000 + Math.floor(Math.random() * 2000),
    undefined: 500 + Math.floor(Math.random() * 1500),
  }
  return baseCounts[mood]
}
```

### 同步设置联动

```typescript
// homeStore.ts
const toggleSyncToCommunity = () => {
  const newSyncStatus = !get().syncToCommunity
  set({ syncToCommunity: newSyncStatus })

  // 同步到 profile store
  profileStore.updatePrivacy({ syncToCommunity: newSyncStatus })
}

// profileStore.ts
const updatePrivacy = (settings: Partial<PrivacySettings>) => {
  set(state => ({
    privacy: { ...state.privacy, ...settings },
  }))

  // 同步到 home store (避免循环依赖)
  if (settings.syncToCommunity !== undefined) {
    // 通过事件或全局状态同步
  }
}
```

### 人格分析算法

```typescript
const analyzePersonality = () => {
  const moodStats = get().moodStats
  const totalMoods = Object.values(moodStats).reduce(
    (sum, count) => sum + count,
    0,
  )

  if (totalMoods < 7) return '数据不足'

  const ratios = {
    struggling: moodStats.struggling / totalMoods,
    fine: moodStats.fine / totalMoods,
    bad: moodStats.bad / totalMoods,
    undefined: moodStats.undefined / totalMoods,
  }

  // 匹配人格类型
  for (const [type, config] of Object.entries(PERSONALITY_TYPES)) {
    const matches = Object.entries(config.conditions).every(
      ([mood, threshold]) => ratios[mood as MoodType] >= threshold - 0.1,
    )
    if (matches) return config.name
  }

  return '混合型'
}
```

---

## 📋 开发优先级

### P0 (必须完成 - Week 1)

- [x] 项目架构搭建
- [ ] 主页打卡功能
- [ ] 情绪选择器组件
- [ ] 同步设置开关
- [ ] 基础状态管理

### P1 (重要功能 - Week 2)

- [ ] 社区帖子展示
- [ ] 打卡同步功能
- [ ] 非点赞互动
- [ ] 人格档案基础版

### P2 (增强功能 - Week 3)

- [ ] 情绪统计图表
- [ ] 隐私设置页面
- [ ] UI 动画优化
- [ ] 用户体验细节

---

## 🎨 UI/UX 设计原则

### 设计基调

- **克制**: 不使用过于鲜艳的颜色
- **温暖**: 使用柔和的色调和圆角
- **简洁**: 减少不必要的装饰元素
- **包容**: 考虑不同情绪状态下的用户体验

### 色彩方案

```typescript
const COLORS = {
  primary: '#5B54E4', // 主色调 - 温和的紫色
  secondary: '#F8F9FA', // 背景色 - 浅灰
  accent: '#FF6B6B', // 强调色 - 温和的红色

  // 情绪色彩
  moods: {
    fine: '#51CF66', // 🟢 还行 - 温和绿色
    struggling: '#FFD43B', // 🟡 勉强 - 温和黄色
    bad: '#FF6B6B', // 🔴 不太好 - 温和红色
    undefined: '#868E96', // ⚪ 不想定义 - 中性灰
  },
}
```

### 交互原则

- **低负担**: 减少操作步骤
- **高容错**: 允许用户反悔和修改
- **温和反馈**: 使用柔和的动画和提示
- **隐私优先**: 默认最严格的隐私设置

---

## 🧪 测试计划

### 功能测试

- [ ] 打卡流程完整性测试
- [ ] 同步功能开关测试
- [ ] 社区互动功能测试
- [ ] 人格分析准确性测试

### 用户体验测试

- [ ] 不同情绪状态下的使用体验
- [ ] 长期使用的心理感受
- [ ] 隐私设置的用户理解度
- [ ] 界面操作的直观性

### 性能测试

- [ ] 应用启动速度
- [ ] 页面切换流畅度
- [ ] 内存使用情况
- [ ] 电池消耗测试

---

## 📈 后续迭代计划

### Phase 2 (可选功能)

- [ ] 邮件提醒功能
- [ ] 数据导出功能
- [ ] 主题定制
- [ ] 高级人格分析

### Phase 3 (扩展功能)

- [ ] 短信提醒
- [ ] 小组件支持
- [ ] 数据备份同步
- [ ] 社区推荐算法

---

## 📝 开发注意事项

### 技术要点

- 保持代码简洁，避免过度工程化
- 重视用户体验，特别是情绪敏感用户
- 确保隐私安全，默认最严格设置
- 预留扩展空间，便于后续功能迭代

### 产品要点

- 始终围绕"确认存在"的核心价值
- 避免制造焦虑和压力
- 保持克制的设计风格
- 重视用户的情感安全

---

## 📞 联系信息

如有任何问题或需要调整计划，请及时沟通。

**项目状态**: 开发中  
**最后更新**: 2024 年 1 月 14 日  
**版本**: v1.0
