# Dashboard Layout Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将今日总览改为已确认的纵向卡片布局，并压缩重复及辅助空状态。

**Architecture:** 保留 `DashboardPage` 的数据聚合职责与现有四个领域组件，只调整页面组合关系和各组件的展示样式。通过页面组件测试约束模块顺序、同级纵向结构和唯一的新建任务入口，不引入新依赖或新业务抽象。

**Tech Stack:** React 19、TypeScript、CSS Modules、Vitest、jsdom

## Global Constraints

- 只修改“今日总览”，不处理岗位编辑回填问题。
- 不改变任务、岗位、LeetCode 的查询、更新和持久化逻辑。
- 不引入第三方依赖，不重构无关页面或共享组件。
- 保留所有现有操作能力及中文文案语义。

---

### Task 1: 锁定纵向布局和空状态行为

**Files:**
- Create: `client/src/pages/dashboard/DashboardPage.test.tsx`
- Modify: `client/src/pages/dashboard/DashboardPage.tsx`
- Modify: `client/src/pages/dashboard/DashboardPage.module.css`
- Modify: `client/src/pages/dashboard/components/TodayTasks.tsx`
- Modify: `client/src/pages/dashboard/components/NextActions.tsx`
- Modify: `client/src/pages/dashboard/components/ReviewReminders.tsx`

**Interfaces:**
- Consumes: 现有 `TodayTasks`、`OverdueTasks`、`NextActions`、`ReviewReminders` props，不变更公开 props。
- Produces: 四个模块作为同一纵向容器的直接同级子节点；空总览中仅一个“新建任务”按钮。

- [ ] **Step 1: 写失败测试**

使用 `vi.mock('../../contexts')` 提供空数据状态，将 `DashboardPage` 渲染到 jsdom；断言四个模块根节点共享同一父节点，并断言页面仅有一个文本为“新建任务”的按钮，同时辅助模块显示紧凑空状态文案。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --project client client/src/pages/dashboard/DashboardPage.test.tsx`

Expected: FAIL，因为当前今日/逾期位于双列容器、岗位/复习位于独立容器，且今日任务空状态重复显示“新建任务”。

- [ ] **Step 3: 实现最小结构变更**

在 `DashboardPage.tsx` 中用单个 `contentStack` 依次直接渲染四个模块；移除旧 `grid`/`fullWidth` 包装。今日任务的 `EmptyState` 不再传 `actionLabel` 和 `onAction`；岗位行动和复习提醒的无数据分支改为组件内单行 `emptyState`。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --project client client/src/pages/dashboard/DashboardPage.test.tsx`

Expected: PASS。

### Task 2: 统一卡片样式与宽屏布局

**Files:**
- Modify: `client/src/pages/dashboard/DashboardPage.module.css`
- Modify: `client/src/pages/dashboard/components/WeekProgress.module.css`
- Modify: `client/src/pages/dashboard/components/TodayTasks.module.css`
- Modify: `client/src/pages/dashboard/components/OverdueTasks.module.css`
- Modify: `client/src/pages/dashboard/components/NextActions.module.css`
- Modify: `client/src/pages/dashboard/components/ReviewReminders.module.css`

**Interfaces:**
- Consumes: 项目现有全局颜色、圆角、边框和阴影 CSS 变量。
- Produces: 最大宽度约 1200px 的居中内容区；统一卡片外观；主任务留有舒展空间，辅助空状态保持紧凑。

- [ ] **Step 1: 应用最小样式调整**

将页面改为 `max-width: 1200px; margin: 0 auto;`，用纵向 gap 管理模块间距。为进度和四个模块添加一致的白色背景、边框、8px 圆角和 18–20px 内边距；清除组件原有底部 margin。辅助空状态使用顶部细分隔线和较小垂直内边距，不设置大面积固定高度。

- [ ] **Step 2: 运行完整验证**

Run: `npm test`

Expected: 全部测试通过。

Run: `npm run typecheck`

Expected: 退出码 0，无 TypeScript 错误。

Run: `npm run build`

Expected: 退出码 0，客户端和服务端构建成功。

