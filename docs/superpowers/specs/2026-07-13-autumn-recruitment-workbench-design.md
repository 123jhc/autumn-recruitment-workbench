# 秋招准备工作台设计规格

日期：2026-07-13
状态：待用户书面审阅

## 1. 目标

实现一个仅在本机运行的秋招准备网页工具，把分散的计划、岗位投递和 LeetCode 刷题记录汇总到一个工作台中。用户可以导入规划文档，由 AI 自动拆分为可执行任务，并在“今天”和“本周”视图中完成与跟踪这些任务。

完成后的核心体验是：导入计划 → 审核 AI 任务草稿 → 确认任务 → 查看今天或本周应做事项 → 点击完成；同时可维护岗位投递进度与算法刷题、复习记录。

## 2. 成功标准

1. 可上传 Markdown/TXT 文件或粘贴计划文本，并通过 OpenAI 兼容接口生成结构化任务草稿。
2. AI 草稿在保存前可编辑、删除；只有用户确认后才写入正式任务。
3. 任务支持新增、编辑、删除、筛选和点击完成，并按今天、本周、全部、已完成展示。
4. 岗位投递表可维护岗位目标、要求、投递记录、流程状态和下一步行动。
5. 岗位的下一步行动可生成任务，并出现在对应日期的总览中。
6. LeetCode 模块可维护刷题与复习记录，复习日期可出现在总览中。
7. 刷新页面后数据仍存在；可完整导出 JSON 备份并从 JSON 恢复。
8. AI 请求失败或输出不合法时不污染已有数据。

## 3. 产品范围

### 3.1 今日总览

- 展示今日待办、逾期未完成任务和完成进度。
- 展示本周任务数量与完成进度。
- 展示临近日期的岗位下一步行动。
- 展示当日到期的 LeetCode 复习提醒。
- 支持直接勾选任务完成或取消完成。

### 3.2 计划与任务

- 支持上传 `.md`、`.markdown`、`.txt` 文件。
- 支持直接粘贴计划文本。
- 可选择规划周期：今天、本周或整个秋招阶段。
- 调用 AI 生成任务草稿并展示校验结果。
- 草稿可编辑、删除，确认后批量保存。
- 正式任务支持手动新增、编辑、删除、完成和筛选。
- 任务分类首版使用：简历、项目、算法、八股、投递、面试、其他。

### 3.3 岗位投递

- 维护公司、岗位名称、地点、岗位链接、岗位要求、投递日期、当前状态、下一步行动、下一步日期和备注。
- 状态固定为：目标岗位、准备投递、已投递、笔试、面试、Offer、拒绝。
- 支持按公司、岗位关键词和状态筛选。
- 展示各状态数量统计。
- 可将下一步行动一键创建为关联任务。

### 3.4 LeetCode

- 维护题号、题名、题目链接、难度、标签、状态、解法摘要、完成日期和复习日期。
- 状态固定为：待刷、已完成、需复习。
- 支持按难度、标签和状态筛选。
- 展示本周完成数量与难度分布。
- 到达复习日期时，在今日总览中展示提醒；提醒完成后同步更新刷题记录的复习状态。

### 3.5 数据管理

- 将全部本地数据导出为带版本号的 JSON 文件。
- 导入备份前执行结构校验。
- 恢复前展示数据摘要，用户确认后执行整库替换。
- API Key 不包含在备份中。

## 4. 首版不包含

- 用户账号、云端数据库、多设备同步或协作。
- 招聘网站自动抓取、自动投递或邮箱状态同步。
- LeetCode 账号自动同步。
- Word、PDF 文件解析。
- AI 自动修改已经确认的正式任务。
- 通知中心、系统推送、日历同步和复杂统计报表。

这些能力不作为首版的隐藏扩展点实现；只有实际需要时再设计。

## 5. 技术架构

采用方案 A：React + TypeScript + IndexedDB。

### 5.1 前端

- Vite 负责开发与构建。
- React + TypeScript 实现页面、交互和领域状态。
- React Router 管理四个一级页面和设置页。
- IndexedDB 保存结构化业务数据。
- 使用薄数据访问层隔离 IndexedDB，页面不直接调用数据库 API。

### 5.2 本地服务端

- 使用 Node.js + TypeScript 提供本地 HTTP API。
- 服务端从 `.env` 读取 OpenAI 兼容接口配置，并代理 AI 请求。
- 前端永远不读取、保存或返回完整 API Key。
- 生产使用时由一个启动命令同时启动本地服务端和静态前端。

### 5.3 AI 配置

```env
AI_BASE_URL=https://api.example.com/v1
AI_API_KEY=your-api-key
AI_MODEL=your-model-name
```

- `AI_BASE_URL` 指向兼容 OpenAI Chat Completions 风格的接口根地址。
- `AI_MODEL` 由用户所选供应商决定。
- 缺少配置时，前端展示明确配置说明，任务与投递等非 AI 功能仍可使用。

### 5.4 时间规则

- 所有业务日期按 `Asia/Shanghai` 解释。
- 数据库存储日期字段使用 `YYYY-MM-DD`，时间戳使用 ISO 8601。
- “本周”固定为周一至周日。
- 今日视图包含计划日期为今天、截止日期为今天、以及已逾期且未完成的任务。

## 6. 模块边界

### 6.1 Dashboard

只负责聚合和展示，不直接拥有业务数据。它通过查询接口读取任务、岗位下一步行动和 LeetCode 复习提醒，并将完成操作转发给对应领域服务。

### 6.2 Tasks

负责正式任务与草稿任务。正式任务可以来源于 AI 计划、岗位行动或手动创建。LeetCode 复习使用派生提醒，不创建正式任务。任务删除不反向删除来源记录。

### 6.3 Applications

负责岗位档案与流程状态。创建下一步任务时由任务记录岗位 ID；岗位删除后保留已经创建的任务，任务界面显示“来源已删除”。

### 6.4 LeetCode

负责题目与复习信息。复习提醒采用派生查询，不额外复制成正式任务；用户从总览完成复习时更新题目记录。

### 6.5 Plan Import

负责读取用户输入、调用本地 AI API、校验返回结果和生成草稿。它不能直接写入正式任务；只有“确认导入”操作可以完成草稿到正式任务的转换。

### 6.6 Settings and Backup

负责显示 AI 服务可用状态、导出数据、校验备份和恢复数据。API Key 由 `.env` 管理，设置页只显示是否已配置，不显示 Key 内容。

## 7. 数据模型

### 7.1 Task

```ts
type TaskStatus = 'todo' | 'done'
type TaskPriority = 'high' | 'medium' | 'low'
type TaskCategory = 'resume' | 'project' | 'algorithm' | 'knowledge' | 'application' | 'interview' | 'other'
type TaskSource = 'manual' | 'plan' | 'application'

interface Task {
  id: string
  title: string
  category: TaskCategory
  plannedDate?: string
  dueDate?: string
  priority: TaskPriority
  estimatedMinutes?: number
  status: TaskStatus
  notes?: string
  source: TaskSource
  sourceId?: string
  createdAt: string
  completedAt?: string
  updatedAt: string
}
```

### 7.2 TaskDraft

```ts
interface TaskDraft {
  id: string
  importId: string
  title: string
  category: TaskCategory
  plannedDate?: string
  dueDate?: string
  priority: TaskPriority
  estimatedMinutes?: number
  rationale?: string
}
```

### 7.3 PlanImport

```ts
interface PlanImport {
  id: string
  sourceType: 'file' | 'paste'
  fileName?: string
  rawContent: string
  planningHorizon: 'today' | 'week' | 'season'
  status: 'draft' | 'confirmed' | 'failed'
  createdAt: string
  confirmedAt?: string
}
```

### 7.4 Application

```ts
type ApplicationStatus = 'target' | 'preparing' | 'applied' | 'assessment' | 'interview' | 'offer' | 'rejected'

interface Application {
  id: string
  company: string
  role: string
  location?: string
  url?: string
  requirements?: string
  status: ApplicationStatus
  appliedDate?: string
  nextAction?: string
  nextActionDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}
```

### 7.5 LeetCodeProblem

```ts
type Difficulty = 'easy' | 'medium' | 'hard'
type ProblemStatus = 'todo' | 'solved' | 'review'

interface LeetCodeProblem {
  id: string
  number?: number
  title: string
  url?: string
  difficulty: Difficulty
  tags: string[]
  status: ProblemStatus
  solutionSummary?: string
  solvedDate?: string
  reviewDate?: string
  lastReviewedAt?: string
  createdAt: string
  updatedAt: string
}
```

### 7.6 BackupEnvelope

```ts
interface BackupEnvelope {
  schemaVersion: 1
  exportedAt: string
  data: {
    tasks: Task[]
    taskDrafts: TaskDraft[]
    planImports: PlanImport[]
    applications: Application[]
    leetCodeProblems: LeetCodeProblem[]
  }
}
```

## 8. AI 拆任务协议

### 8.1 请求

前端调用本地端点 `POST /api/plan/parse`：

```json
{
  "content": "计划原文",
  "planningHorizon": "week",
  "today": "2026-07-13",
  "timezone": "Asia/Shanghai"
}
```

服务端限制输入类型和长度，对空文本直接返回 400。首版最大文本长度为 100,000 个字符。

### 8.2 AI 期望输出

```json
{
  "tasks": [
    {
      "title": "完善项目经历描述",
      "category": "resume",
      "plannedDate": "2026-07-14",
      "dueDate": "2026-07-16",
      "priority": "high",
      "estimatedMinutes": 90,
      "rationale": "该任务是本周投递前置条件"
    }
  ]
}
```

服务端必须对 AI 输出做运行时结构校验，并拒绝未知枚举、非法日期、空标题和非正数耗时。若供应商不支持严格结构化输出，服务端从响应文本提取 JSON 后执行同一校验。

### 8.3 原子性

- AI 成功只生成草稿，不写正式任务。
- 用户确认时，在一个 IndexedDB 事务中写入正式任务、更新导入状态并删除对应草稿。
- 任一步骤失败则事务回滚。

## 9. 关键交互

### 9.1 导入计划

1. 用户选择文件或粘贴文本。
2. 用户选择规划周期并点击“AI 拆解任务”。
3. 页面显示加载状态，禁止重复提交。
4. 成功后展示草稿列表和每项拆解依据。
5. 用户编辑、删除或补充草稿。
6. 用户点击“确认添加”，草稿批量转为正式任务。

### 9.2 完成任务

- 点击复选框后立即更新本地数据库。
- 标为完成时记录 `completedAt`；取消完成时清空该字段。
- 更新成功后重新计算总览进度；失败则恢复 UI 状态并显示错误。

### 9.3 岗位下一步行动

- 岗位存在行动标题和日期时，可点击“加入任务”。
- 创建任务后记录 `source = application` 与岗位 ID。
- 同一岗位、同一行动内容和日期已存在未完成任务时，阻止重复创建并定位已有任务。
- 今日总览存在该关联任务时，不再重复展示原始岗位行动。

### 9.4 LeetCode 复习

- 今日总览查询 `reviewDate <= today` 且状态为 `review` 的题目。
- 点击完成复习后记录 `lastReviewedAt`，并让用户选择新的复习日期或结束复习。

## 10. 页面结构

- 左侧导航：今日总览、计划与任务、岗位投递、LeetCode、设置。
- 桌面端以表格和列表为主，适配最小宽度 1024px。
- 总览页优先展示“下一步应该做什么”，避免首版加入复杂仪表盘。
- 编辑操作使用同一套表单抽屉或对话框，减少页面跳转。
- 空状态必须给出下一步操作，例如“导入计划”或“新增岗位”。

首版只要求桌面浏览器可用，不承诺完整移动端交互。

## 11. 错误处理

- 文件格式不支持：拒绝读取并列出允许类型。
- 文件或粘贴内容为空：不发起 AI 请求。
- AI 未配置：返回可操作的 `.env` 配置提示。
- AI 超时或网络失败：保留原始输入并允许重试。
- AI 输出不合法：展示校验摘要，不创建草稿或正式任务。
- IndexedDB 写入失败：回滚界面乐观更新并提示导出备份。
- 备份版本不支持：拒绝恢复，不修改现有数据。
- 恢复过程中失败：事务回滚，保持原数据库不变。

错误消息不显示 API Key、完整上游响应头或其他敏感配置。

## 12. 测试与验证

### 12.1 单元测试

- 日期边界：今天、本周、逾期和跨周任务查询。
- AI 输出结构校验与非法数据拒绝。
- 岗位行动去重规则。
- 总览聚合规则。
- 备份格式校验与版本拒绝。

### 12.2 数据访问测试

- 各实体 CRUD。
- 草稿确认事务的成功与回滚。
- 数据恢复整库替换的成功与回滚。
- 刷新后数据持久化。

### 12.3 组件与流程测试

- 上传或粘贴计划 → AI 草稿 → 编辑 → 确认 → 今日/本周出现。
- 创建岗位 → 更新状态 → 创建下一步任务。
- 创建 LeetCode 记录 → 到期提醒 → 完成复习。
- 点击完成任务后，总览进度即时变化。

### 12.4 服务端测试

- 缺少 AI 配置时返回稳定错误码。
- 兼容接口成功、超时、非 2xx、非 JSON 与字段非法响应。
- 输入长度限制与敏感信息不泄漏。

### 12.5 手动验收

1. 使用真实 OpenAI 兼容服务导入一份计划并确认任务。
2. 刷新页面，验证任务、岗位和题目记录仍存在。
3. 完成今日任务，验证今日和本周完成率同步更新。
4. 从岗位生成下一步任务，验证关联与重复创建保护。
5. 设置一道题为今天复习，验证总览提醒与完成动作。
6. 导出 JSON，新增若干数据，再恢复备份，验证恢复结果与摘要一致。
7. 临时移除 AI 配置，验证非 AI 功能仍可使用且提示清晰。

## 13. 交付形态

- 项目包含开发、构建、测试和本地启动命令。
- 提供 `.env.example`，不提交真实 Key。
- README 说明安装、AI 配置、运行、备份与验收步骤。
- 默认示例数据只在用户主动选择时导入，不污染真实数据库。
