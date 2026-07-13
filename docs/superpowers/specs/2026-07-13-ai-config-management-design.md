# AI 配置管理优化设计

- 日期：2026-07-13
- 状态：待评审
- 范围：设置页 AI 服务状态区块 + 岗位投递编辑表单修复

## 背景与问题

当前 AI 配置链路存在三个问题：

1. **AI 配置编辑表单不回显当前配置**：`AiStatus` 组件常驻挂载，`useState` 只在首次挂载用硬编码默认值（`deepseek-chat`、`https://api.deepseek.com/v1`、空 key）初始化，点击"编辑配置"看到的是硬编码值，不是当前实际配置。且当前配置的 `baseUrl` 从未暴露给前端。
2. **API Key 占位符 `sk-...` 不当**：编辑时 Key 框不应显示该占位符。
3. **岗位投递编辑不回显旧内容**：`ApplicationForm` 常驻挂载，`useState` 只初始化一次，点击不同记录的"编辑"时表单不更新为该记录内容——这是真实 bug。

此外需要增强：AI 服务状态支持**记录多个配置**、**选择激活其中一个**、激活后顶部显示**连通/可用**状态。

## 目标

- AI 配置可在网页管理多个，单选激活一个，激活配置显示连通性
- 编辑已有配置时回显当前值（Key 除外），Key 留空表示不修改
- Model 默认值改为 `deepseek-v4-flash`
- 修复岗位投递编辑表单不回显旧内容的 bug
- 遵循"API Key 仅存服务端、不回显、不进日志、不进备份"约束

## 非目标

- 不做多配置轮询、负载均衡、自动故障转移
- 不做配置导入导出（备份功能仍只覆盖 IndexedDB 业务数据，与服务端配置文件无关）
- 不引入数据库依赖

## 关键决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 多配置存储位置 | 服务端 JSON 文件（`server/ai-configs.json`） | 符合本机工具定位与"Key 仅存服务端"约束，无新依赖 |
| 连通性判定 | 发真实轻量请求（`max_tokens:1`，`messages:[{role:'user',content:'ok'}]`） | 准确反映 baseUrl+key+model 能否真正调通 |
| 编辑时 Key 字段 | 不回显，留空表示不修改 | 避免明文密钥回显页面 |
| `.env` 与 JSON 关系 | `.env` 仅首次引导 | JSON 不存在或为空时，用 `.env` 三项齐全生成"默认"配置并激活；之后以 JSON 为权威 |
| 激活交互 | 单选激活一个 | 简单明确，AI 代理实际只用一个配置 |
| 编辑表单回显修复 | `key` 重挂机制 | 切换记录时 React 卸载重挂，`useState` 重新初始化，改动极小 |

## 后端架构

### 文件结构

```
server/
  src/
    services/ai/
      config-store.ts     新增：读写 server/ai-configs.json，串行化落盘
      client.ts           改造：新增 callAiProbe()，callAi() 改读激活配置
    routes/
      ai-configs.ts       新增：CRUD + 激活 + 测试（替代当前 ai-config.ts）
      ai-status.ts        改造：返回当前激活配置状态 + available
      plan/parse.ts       改造：从 config-store 取激活配置
    plugins/env.ts        改造：启动时首次引导 config-store，移除标量字段
  ai-configs.json         新增运行时文件，加入 .gitignore
```

`server/src/routes/ai-config.ts`（上一版单路由）删除，由 `ai-configs.ts` 替代。

### 数据模型

```ts
// 服务端存储（server/ai-configs.json）
interface AiConfigEntry {
  id: string        // crypto.randomUUID()
  name: string      // 用户命名，如「DeepSeek 官方」
  baseUrl: string
  apiKey: string    // 仅存服务端
  model: string
}

interface AiConfigsStore {
  configs: AiConfigEntry[]
  activeId: string | null
}
```

```ts
// 前端视图（不含 apiKey 明文）
interface AiConfigView {
  id: string
  name: string
  baseUrl: string
  model: string
  hasApiKey: boolean   // 仅告知前端是否已存 key
  available: boolean | null   // 该配置连通性：true/false/null(未测试)
}
```

### 首次引导逻辑（env.ts 改造）

服务启动时：
1. 若 `server/ai-configs.json` 存在且非空 → 直接加载，忽略 `.env` 中 AI 配置
2. 若文件不存在或 `configs` 为空 → 检查 `.env` 的 `AI_BASE_URL/AI_API_KEY/AI_MODEL`
   - 三项齐全 → 生成一条 `{name:'默认', baseUrl, apiKey, model}` 配置，`activeId` 指向它，落盘
   - 缺项 → 写入空 store（`configs:[], activeId:null`），AI 代理处于未配置状态
3. 之后所有读写以 JSON 文件为准

### API 路由

| 方法 | 路径 | 作用 | 请求体 → 响应 |
|---|---|---|---|
| `GET` | `/api/ai/configs` | 列出配置（不含 apiKey） | → `{ configs: AiConfigView[], activeId }` |
| `POST` | `/api/ai/configs` | 新增 | `{ name, baseUrl, apiKey, model }` → `{ id, name, baseUrl, model }` |
| `PUT` | `/api/ai/configs/:id` | 更新（apiKey 可选） | `{ name?, baseUrl?, apiKey?, model? }` → `{ id, name, baseUrl, model }` |
| `DELETE` | `/api/ai/configs/:id` | 删除 | → `{ ok: true }` |
| `PUT` | `/api/ai/configs/:id/active` | 设为激活 | → `{ activeId }` |
| `POST` | `/api/ai/configs/:id/test` | 连通测试 | → `{ ok: boolean, message?: string }` |
| `GET` | `/api/ai/status` | 当前激活配置状态 | → `{ configured, model?, available? }` |

### 行为约定

1. **apiKey 留空不修改**：`PUT /api/ai/configs/:id` 收到 `apiKey` 为 `undefined` 或空字符串时保留原 key，非空才覆盖。
2. **删除激活配置**：删的是当前 `activeId` → `activeId` 置 `null`，AI 代理回到未配置状态。
3. **连通测试**：用指定配置向 `{baseUrl}/chat/completions` 发 `max_tokens:1`、`messages:[{role:'user',content:'ok'}]` 请求，超时 15 秒。2xx 且有 `choices` 判定 `ok:true`；否则 `ok:false` + 可读 `message`。**不抛 500**，结果作为 200 响应体返回，让前端直接展示。
4. **连通缓存**：每个配置的连通结果按 `id` 缓存在 `config-store` 内存，`GET /api/ai/configs` 与 `GET /api/ai/status` 直接读缓存不重复打远程。配置被更新（baseUrl/key/model 变化）或删除时，对应缓存清除并视为 `null`（未测试）。`GET /api/ai/status` 的 `available` = 激活配置的缓存值。
5. **并发写入**：`config-store` 用内存 Promise 队列串行化读-改-写，保证落盘原子性。
6. **AI 代理取配置**：`plan/parse.ts` 与 `callAi()` 从 `config-store` 取激活配置；无激活配置或激活配置缺字段 → 抛现有 `AiNotConfiguredError`（503），保持现有未配置路径行为不变。

### 边界校验

- `name` 非空、≤ 30 字符
- `baseUrl` 合法 http(s) URL
- `model` 非空
- `apiKey` 新增时必填，编辑时可选
- Fastify schema + 路由内手动校验结合；错误消息可操作但不含 key、不含 URL 鉴权段

## 前端架构

### 文件结构

```
client/src/pages/settings/components/
  AiStatus.tsx           改造：当前激活配置概览 + 连通徽章 + 展开列表入口
  AiConfigList.tsx       新增：配置列表 + 新增/编辑/删除/激活/测试
  AiConfigForm.tsx       新增：新增/编辑共用表单（Drawer）
  AiStatus.module.css    扩展样式
```

### SettingsContext 状态扩展

```ts
interface SettingsState {
  aiConfigs: AiConfigView[]      // 每条含自己的 available
  activeId: string | null
  loading: boolean
  error: string | null
}
```

`AiConfigView.available` 每个配置独立持有连通状态。顶部概览显示激活配置的 `available`；列表每行显示各自的 `available`。`testConfig(id)` 只更新对应那条的 `available`，不动其他。

Context 方法：`loadConfigs`、`createConfig`、`updateConfig`、`deleteConfig`、`setActive`、`testConfig(id)`。挂载时调用一次 `loadConfigs()`。

`AiStatusResponse` 的 `available` 字段 = 激活配置的 `available`，由服务端从 `config-store` 内存缓存读取。

### api-client 扩展

新增对应六个配置接口的调用函数，返回类型对齐 `AiConfigView` 与 `{ok, message}`。

### AiStatus 顶部概览（非编辑态）

```
AI 服务状态
[已配置] DeepSeek 官方 · deepseek-v4-flash  [可用 ✓]   [刷新] [编辑配置]
```

- 已配置：Badge + 激活配置名 + model + 连通徽章（该配置 `available`：`true` 绿"可用"、`false` 红"不可用"、`null` 灰"未测试"）
- 未配置：Badge"未配置"，无连通徽章
- "编辑配置"按钮展开 `AiConfigList`

### AiConfigList（展开后）

```
┌───────────────────────────────────────────────────┐
│ AI 配置                            [+ 新增配置]    │
├───────────────────────────────────────────────────┤
│ ◉ DeepSeek 官方   deepseek-v4-flash  [可用]       │
│   [测试] [编辑] [删除]                             │
├───────────────────────────────────────────────────┤
│ ○ OpenAI 备用     gpt-4o-mini       [未测试]      │
│   [设为当前] [测试] [编辑] [删除]                   │
└───────────────────────────────────────────────────┘
```

- 单选激活：激活项 `◉` 且无"设为当前"按钮；非激活项 `○` + "设为当前"
- "测试"：调 `testConfig(id)`，按钮 loading，结果更新该行连通徽章
- "删除"：复用 `ConfirmDialog`，删激活项时提示"当前正在使用，删除后将变为未配置"
- "+ 新增配置"与"编辑"打开 `AiConfigForm`（Drawer）

### AiConfigForm（Drawer 内）

字段：名称、API Base URL、API Key、Model

- **新增**：四项空，Key 占位符 `sk-...`，Model 预填 `deepseek-v4-flash`
- **编辑**：名称/URL/Model 回显当前值；Key 框留空，占位符"留空表示不修改"
- 保存：新增传 `{name, baseUrl, apiKey, model}`；编辑传 `{name, baseUrl, model}` + 仅 Key 非空才带 `apiKey`
- 验证：名称、URL、Model 非空；Key 新增必填、编辑可选
- 复用现有 `Drawer` / `FormField` / `Button`，风格与 `ApplicationForm` 一致
- 用 `key={editing?.id ?? 'new'}` 触发切换记录时重挂载，`useState` 重新初始化

### 岗位投递编辑修复

`ApplicationsPage.tsx` 中 `<ApplicationForm>` 加 `key={editingApp?.id ?? 'new'}`，使点不同记录"编辑"时表单重新初始化为该记录内容。顺手清理 `handleSubmitForm` 中已无意义的 `setForm({...EMPTY_FORM})`（Drawer 关闭即卸载）。

## 错误处理

| 场景 | 处理 |
|---|---|
| `name`/`baseUrl`/`model` 校验失败 | 400 + 可读消息 |
| `apiKey` 新增为空 | 400 "请填写 API Key" |
| 连通测试超时 | `{ok:false, message:"连接超时(15秒)"}` |
| 连通测试 401/403 | `{ok:false, message:"鉴权失败，请检查 API Key"}` |
| 连通测试 404 | `{ok:false, message:"接口路径不存在，请检查 Base URL"}` |
| 连通测试其他非 2xx | `{ok:false, message:"服务返回 {status}"}` |
| 删除/激活不存在的 id | 404 "配置不存在" |
| JSON 读写失败 | 服务端日志（不含 key），500 "配置存储异常，请重试" |
| 并发写覆盖 | 串行队列保证原子，对前端不可见 |

所有返回给前端的 `message` 不含 apiKey 与 URL 鉴权段。

## 测试方案

沿用 vitest + Fastify inject 模式。

1. **`server/src/services/ai/__tests__/config-store.test.ts`**
   - 首次引导：JSON 不存在 + `.env` 三项齐全 → 生成"默认"配置并激活
   - 首次引导：`.env` 缺项 → 空配置 + `activeId:null`
   - CRUD 读写正确性
   - 更新 apiKey 留空 → 保留原 key（核心断言）
   - 删除激活配置 → `activeId` 置 null
   - 并发写：两个近同时写操作都落盘无丢失

2. **`server/src/routes/__tests__/ai-configs.test.ts`**
   - `GET /configs` 视图不含 `apiKey`，含 `hasApiKey`
   - 新增、更新（apiKey 留空不修改）、删除、激活、测试
   - 连通测试 mock fetch：2xx → `ok:true`；401 → message 含"鉴权"；超时 → `ok:false`
   - 校验失败 → 400

3. **`client/src/pages/settings/components/__tests__/AiConfigList.test.tsx`**
   - 激活项显示 `◉` 且无"设为当前"按钮
   - 点"测试"调 `testConfig`，loading 正确
   - 删除激活项弹确认且提示"正在使用"
   - mock `useSettingsContext`，参照 `DashboardPage.test.tsx` 模式

4. **`client/src/pages/settings/components/__tests__/AiConfigForm.test.tsx`**
   - 编辑模式：名称/URL/Model 回显，Key 框空且占位符"留空表示不修改"
   - 新增模式：Key 占位符 `sk-...`，Model 预填 `deepseek-v4-flash`
   - 编辑模式 Key 留空 → 提交请求体不含 `apiKey`

保留现有 `client.test.ts`、`parse.test.ts`（503 未配置路径仍成立）。

## 验证

- `npm test` 全绿
- `npm run typecheck` 全绿
- `npm run build` 全绿

## 安全约束

- `apiKey` 仅存 `server/ai-configs.json`，不发给前端、不写日志、不进备份
- `server/ai-configs.json` 写入 `.gitignore`
- 前端视图 `AiConfigView` 不含 apiKey 明文，仅 `hasApiKey` 布尔
- 错误消息不含密钥与 URL 鉴权段

## 工程约束遵循

- 只改本任务所需文件，不重构无关代码
- 领域逻辑（config-store、callAi）与路由、组件分离
- 外部输入在边界校验（路由 schema + 表单校验）
- 新增 `crypto.randomUUID`（Node 内置），无新第三方依赖
- 保持现有代码风格与目录结构
