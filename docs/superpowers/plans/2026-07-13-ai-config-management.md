# AI 配置管理优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把单条 AI 配置升级为服务端 JSON 多配置管理，支持网页新增/编辑/删除/单选激活/连通测试，并修复 AI 配置与岗位投递编辑表单不回显旧内容的 bug。

**Architecture:** 服务端新增 `config-store`（读写 `server/ai-configs.json`，串行落盘）+ 一组配置路由 + `callAiProbe` 连通测试；`callAi` 与 `plan/parse` 改读激活配置；`.env` 仅作首次引导。前端拆出 `AiConfigList` / `AiConfigForm`，`SettingsContext` 持有多配置状态。两处编辑表单用 `key` 重挂机制保证回显。

**Tech Stack:** Fastify 5、Node `crypto.randomUUID`、React 19、CSS Modules、Vitest、jsdom。无新第三方依赖。

## Global Constraints

- 不重构无关代码，只改本任务所需文件
- `apiKey` 仅存服务端 JSON，不发给前端、不写日志、不进备份
- `server/ai-configs.json` 加入 `.gitignore`
- 领域逻辑（config-store、callAi）与路由、组件分离
- 保持现有目录结构与代码风格（中文文案、CSS Modules）
- 每个任务结束前该任务相关测试全绿

## File Structure

**新建：**
- `server/src/services/ai/config-store.ts` — 读写 `server/ai-configs.json`，串行化，含首次引导与连通缓存
- `server/src/routes/ai-configs.ts` — CRUD + 激活 + 测试路由
- `server/src/routes/__tests__/ai-configs.test.ts` — 路由测试
- `server/src/services/ai/__tests__/config-store.test.ts` — config-store 测试
- `client/src/pages/settings/components/AiConfigList.tsx` — 配置列表
- `client/src/pages/settings/components/AiConfigList.module.css`
- `client/src/pages/settings/components/AiConfigForm.tsx` — 新增/编辑共用表单
- `client/src/pages/settings/components/AiConfigForm.module.css`
- `client/src/pages/settings/components/__tests__/AiConfigList.test.tsx`
- `client/src/pages/settings/components/__tests__/AiConfigForm.test.tsx`

**修改：**
- `shared/src/types/api.ts` — 扩展 `AiStatusResponse`，新增 `AiConfigView` / `AiConfigRequest` 等类型
- `server/src/services/ai/client.ts` — 新增 `callAiProbe`
- `server/src/plugins/env.ts` — 改为启动时引导 config-store，移除标量 `aiConfig`
- `server/src/index.ts` — 注册 ai-configs 路由，移除 ai-config 路由
- `server/src/routes/plan/parse.ts` — 从 config-store 取激活配置
- `server/src/routes/ai-status.ts` — 返回激活配置 + available
- `client/src/services/api-client.ts` — 新增配置接口调用
- `client/src/contexts/settings-context.tsx` — 多配置状态与方法
- `client/src/pages/settings/components/AiStatus.tsx` — 顶部概览 + 展开列表
- `client/src/pages/settings/components/AiStatus.module.css` — 扩展样式
- `client/src/pages/applications/ApplicationsPage.tsx` — `ApplicationForm` 加 `key`

**删除：**
- `server/src/routes/ai-config.ts` — 上一版单路由，由 `ai-configs.ts` 替代

---

### Task 1: 扩展共享类型

**Files:**
- Modify: `shared/src/types/api.ts`
- Modify: `shared/src/types/index.ts`

- [ ] **Step 1: 扩展 `shared/src/types/api.ts`**

在文件末尾追加（保留现有 `AiStatusResponse`，扩展它并新增配置类型）：

```ts
export interface AiStatusResponse {
  configured: boolean
  model?: string
  available?: boolean | null
}

export interface AiConfigView {
  id: string
  name: string
  baseUrl: string
  model: string
  hasApiKey: boolean
  available: boolean | null
}

export interface AiConfigsResponse {
  configs: AiConfigView[]
  activeId: string | null
}

export interface AiConfigRequest {
  name: string
  baseUrl: string
  apiKey?: string
  model: string
}

export interface AiConfigTestResponse {
  ok: boolean
  message?: string
}
```

- [ ] **Step 2: 在 `shared/src/types/index.ts` 追加导出**

把第 7 行替换为：

```ts
export type {
  ExtractResponse,
  ParsePlanRequest,
  AiTaskItem,
  ParsePlanResponse,
  AiStatusResponse,
  AiConfigView,
  AiConfigsResponse,
  AiConfigRequest,
  AiConfigTestResponse,
} from './api'
```

- [ ] **Step 3: 类型检查**

Run: `npm run typecheck --workspace=shared`
Expected: PASS，无输出错误。

- [ ] **Step 4: Commit**

```bash
git add shared/src/types/api.ts shared/src/types/index.ts
git commit -m "feat(shared): add AI config management types"
```

---

### Task 2: config-store 领域模块（TDD）

**Files:**
- Create: `server/src/services/ai/config-store.ts`
- Test: `server/src/services/ai/__tests__/config-store.test.ts`

config-store 负责：读写 `server/ai-configs.json`、首次引导、CRUD、激活、连通缓存、串行化。导出一个单例对象 `configStore`，方法异步。

- [ ] **Step 1: 写失败测试 `config-store.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// 每个测试用独立临时目录，避免污染真实 ai-configs.json
let tmpDir: string
let storePath: string

async function importStore() {
  // 用变量注入路径：测试前设置 env，再动态 import 模块
  vi.resetModules()
  process.env.AI_CONFIGS_PATH = storePath
  const mod = await import('../config-store.js')
  return mod.configStore
}

describe('configStore', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ai-cfg-'))
    storePath = join(tmpDir, 'ai-configs.json')
    delete process.env.AI_BASE_URL
    delete process.env.AI_API_KEY
    delete process.env.AI_MODEL
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
    delete process.env.AI_CONFIGS_PATH
  })

  it('seeds from .env when json missing and env complete', async () => {
    process.env.AI_BASE_URL = 'https://api.deepseek.com/v1'
    process.env.AI_API_KEY = 'sk-seed'
    process.env.AI_MODEL = 'deepseek-v4-flash'

    const store = await importStore()
    const snapshot = store.snapshot()

    expect(snapshot.configs).toHaveLength(1)
    expect(snapshot.configs[0]).toMatchObject({
      name: '默认',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: 'sk-seed',
      model: 'deepseek-v4-flash',
    })
    expect(snapshot.activeId).toBe(snapshot.configs[0].id)
    expect(existsSync(storePath)).toBe(true)
  })

  it('seeds empty store when env missing', async () => {
    const store = await importStore()
    const snapshot = store.snapshot()

    expect(snapshot.configs).toHaveLength(0)
    expect(snapshot.activeId).toBeNull()
  })

  it('creates a config and persists', async () => {
    const store = await importStore()
    const created = await store.create({
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: 'sk-1',
      model: 'deepseek-v4-flash',
    })

    expect(created.name).toBe('DeepSeek')
    const onDisk = JSON.parse(readFileSync(storePath, 'utf-8'))
    expect(onDisk.configs).toHaveLength(1)
    expect(onDisk.configs[0].apiKey).toBe('sk-1')
  })

  it('update preserves apiKey when apiKey omitted', async () => {
    const store = await importStore()
    const created = await store.create({
      name: 'A',
      baseUrl: 'https://a/v1',
      apiKey: 'sk-orig',
      model: 'm',
    })

    await store.update(created.id, { name: 'A2', baseUrl: 'https://a/v1', model: 'm2' })
    const snap = store.snapshot()
    expect(snap.configs[0].name).toBe('A2')
    expect(snap.configs[0].model).toBe('m2')
    expect(snap.configs[0].apiKey).toBe('sk-orig')
  })

  it('update overwrites apiKey when provided', async () => {
    const store = await importStore()
    const created = await store.create({
      name: 'A',
      baseUrl: 'https://a/v1',
      apiKey: 'sk-orig',
      model: 'm',
    })

    await store.update(created.id, { name: 'A', baseUrl: 'https://a/v1', apiKey: 'sk-new', model: 'm' })
    expect(store.snapshot().configs[0].apiKey).toBe('sk-new')
  })

  it('delete active config clears activeId', async () => {
    const store = await importStore()
    const created = await store.create({
      name: 'A',
      baseUrl: 'https://a/v1',
      apiKey: 'sk',
      model: 'm',
    })
    await store.setActive(created.id)
    expect(store.snapshot().activeId).toBe(created.id)

    await store.remove(created.id)
    expect(store.snapshot().configs).toHaveLength(0)
    expect(store.snapshot().activeId).toBeNull()
  })

  it('getActive returns active config or null', async () => {
    const store = await importStore()
    expect(store.getActive()).toBeNull()

    const created = await store.create({
      name: 'A',
      baseUrl: 'https://a/v1',
      apiKey: 'sk',
      model: 'm',
    })
    await store.setActive(created.id)
    const active = store.getActive()
    expect(active?.id).toBe(created.id)
  })

  it('setAvailability caches by id and clears on update', async () => {
    const store = await importStore()
    const created = await store.create({
      name: 'A',
      baseUrl: 'https://a/v1',
      apiKey: 'sk',
      model: 'm',
    })

    store.setAvailability(created.id, true)
    expect(store.snapshot().configs[0].available).toBe(true)

    await store.update(created.id, { name: 'A', baseUrl: 'https://a/v1', model: 'm' })
    expect(store.snapshot().configs[0].available).toBeNull()
  })

  it('serializes concurrent writes without loss', async () => {
    const store = await importStore()
    const a = await store.create({ name: 'A', baseUrl: 'https://a/v1', apiKey: 'sk-a', model: 'm' })
    const b = await store.create({ name: 'B', baseUrl: 'https://b/v1', apiKey: 'sk-b', model: 'm' })

    await Promise.all([
      store.update(a.id, { name: 'A1', baseUrl: 'https://a/v1', model: 'm' }),
      store.update(b.id, { name: 'B1', baseUrl: 'https://b/v1', model: 'm' }),
    ])

    const snap = store.snapshot()
    expect(snap.configs.find((c) => c.id === a.id)?.name).toBe('A1')
    expect(snap.configs.find((c) => c.id === b.id)?.name).toBe('B1')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- server/src/services/ai/__tests__/config-store.test.ts`
Expected: FAIL，`Cannot find module '../config-store.js'`。

- [ ] **Step 3: 实现 `config-store.ts`**

```ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

export interface AiConfigEntry {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  model: string
  available: boolean | null
}

export interface AiConfigUpdate {
  name?: string
  baseUrl?: string
  apiKey?: string
  model?: string
}

interface StoreShape {
  configs: AiConfigEntry[]
  activeId: string | null
}

const DEFAULT_PATH = 'server/ai-configs.json'

function resolvePath(): string {
  return process.env.AI_CONFIGS_PATH || DEFAULT_PATH
}

function emptyStore(): StoreShape {
  return { configs: [], activeId: null }
}

function readDisk(path: string): StoreShape | null {
  if (!existsSync(path)) return null
  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(raw) as StoreShape
    if (!parsed || !Array.isArray(parsed.configs)) return emptyStore()
    // 保证 available 字段存在
    parsed.configs = parsed.configs.map((c) => ({ ...c, available: c.available ?? null }))
    return parsed
  } catch {
    return emptyStore()
  }
}

function writeDisk(path: string, store: StoreShape): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(store, null, 2), 'utf-8')
}

function seedFromEnv(): StoreShape {
  const baseUrl = process.env.AI_BASE_URL?.trim()
  const apiKey = process.env.AI_API_KEY?.trim()
  const model = process.env.AI_MODEL?.trim()
  if (!baseUrl || !apiKey || !model) return emptyStore()
  const entry: AiConfigEntry = {
    id: randomUUID(),
    name: '默认',
    baseUrl,
    apiKey,
    model,
    available: null,
  }
  return { configs: [entry], activeId: entry.id }
}

class ConfigStore {
  private store: StoreShape
  private path: string
  private chain: Promise<void> = Promise.resolve()

  constructor() {
    this.path = resolvePath()
    const disk = readDisk(this.path)
    if (disk) {
      this.store = disk
    } else {
      this.store = seedFromEnv()
      if (this.store.configs.length > 0) writeDisk(this.path, this.store)
    }
  }

  private serialize(task: () => void): Promise<void> {
    const run = this.chain.then(() => task())
    this.chain = run.catch(() => {})
    return run
  }

  private persist(): void {
    writeDisk(this.path, this.store)
  }

  snapshot(): StoreShape {
    // 返回深拷贝避免外部篡改
    return {
      configs: this.store.configs.map((c) => ({ ...c })),
      activeId: this.store.activeId,
    }
  }

  getActive(): AiConfigEntry | null {
    if (!this.store.activeId) return null
    return this.store.configs.find((c) => c.id === this.store.activeId) ?? null
  }

  async create(input: {
    name: string
    baseUrl: string
    apiKey: string
    model: string
  }): Promise<AiConfigEntry> {
    const entry: AiConfigEntry = {
      id: randomUUID(),
      name: input.name,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      model: input.model,
      available: null,
    }
    await this.serialize(() => {
      this.store.configs.push(entry)
      this.persist()
    })
    return { ...entry }
  }

  async update(id: string, patch: AiConfigUpdate): Promise<AiConfigEntry | null> {
    let result: AiConfigEntry | null = null
    await this.serialize(() => {
      const idx = this.store.configs.findIndex((c) => c.id === id)
      if (idx === -1) return
      const current = this.store.configs[idx]
      const next: AiConfigEntry = {
        id: current.id,
        name: patch.name ?? current.name,
        baseUrl: patch.baseUrl ?? current.baseUrl,
        apiKey: patch.apiKey && patch.apiKey.trim() ? patch.apiKey : current.apiKey,
        model: patch.model ?? current.model,
        available: null, // 配置变更后清除连通缓存
      }
      this.store.configs[idx] = next
      result = { ...next }
      this.persist()
    })
    return result
  }

  async remove(id: string): Promise<boolean> {
    let removed = false
    await this.serialize(() => {
      const before = this.store.configs.length
      this.store.configs = this.store.configs.filter((c) => c.id !== id)
      removed = this.store.configs.length < before
      if (this.store.activeId === id) this.store.activeId = null
      this.persist()
    })
    return removed
  }

  async setActive(id: string): Promise<boolean> {
    let ok = false
    await this.serialize(() => {
      if (this.store.configs.some((c) => c.id === id)) {
        this.store.activeId = id
        ok = true
        this.persist()
      }
    })
    return ok
  }

  setAvailability(id: string, available: boolean): void {
    const cfg = this.store.configs.find((c) => c.id === id)
    if (cfg) {
      cfg.available = available
      // 连通缓存只在内存，不落盘（避免每次测试都写文件）
    }
  }

  getById(id: string): AiConfigEntry | null {
    return this.store.configs.find((c) => c.id === id) ?? null
  }
}

export const configStore = new ConfigStore()
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- server/src/services/ai/__tests__/config-store.test.ts`
Expected: PASS，9 tests。

- [ ] **Step 5: Commit**

```bash
git add server/src/services/ai/config-store.ts server/src/services/ai/__tests__/config-store.test.ts
git commit -m "feat(server): add config-store with seeding, CRUD, availability cache"
```

---

### Task 3: callAiProbe 连通测试（TDD）

**Files:**
- Modify: `server/src/services/ai/client.ts`
- Test: `server/src/services/ai/__tests__/client.test.ts`

`callAi` 主体不动。新增 `callAiProbe(config, timeoutMs)` 发 `max_tokens:1` 请求，返回 `{ok, message}`。

- [ ] **Step 1: 在 `client.test.ts` 末尾追加 probe 测试**

在文件末尾追加（保留现有测试）：

```ts
describe('callAiProbe', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns ok:true on 2xx with choices', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'o' } }] }),
      }),
    )
    const { callAiProbe } = await import('../client.js')
    const result = await callAiProbe(config, 15_000)
    expect(result).toEqual({ ok: true })
    const body = JSON.parse((fetch as any).mock.calls[0][1].body)
    expect(body.max_tokens).toBe(1)
  })

  it('returns ok:false with auth message on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    )
    const { callAiProbe } = await import('../client.js')
    const result = await callAiProbe(config, 15_000)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('鉴权')
  })

  it('returns ok:false with not-found message on 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    )
    const { callAiProbe } = await import('../client.js')
    const result = await callAiProbe(config, 15_000)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('Base URL')
  })

  it('returns ok:false on timeout', async () => {
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))
    const { callAiProbe } = await import('../client.js')
    const result = await callAiProbe(config, 15_000)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('超时')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- server/src/services/ai/__tests__/client.test.ts`
Expected: FAIL，`callAiProbe is not a function`。

- [ ] **Step 3: 在 `client.ts` 末尾追加 `callAiProbe`**

```ts
export interface AiProbeResult {
  ok: boolean
  message?: string
}

export async function callAiProbe(config: AiConfig, timeoutMs = 15_000): Promise<AiProbeResult> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'ok' }],
        max_tokens: 1,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { ok: false, message: '鉴权失败，请检查 API Key' }
      }
      if (response.status === 404) {
        return { ok: false, message: '接口路径不存在，请检查 Base URL' }
      }
      return { ok: false, message: `服务返回 ${response.status}` }
    }

    const data = (await response.json()) as { choices?: unknown }
    if (!data.choices) {
      return { ok: false, message: '响应缺少 choices 字段' }
    }
    return { ok: true }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return { ok: false, message: `连接超时(${Math.round(timeoutMs / 1000)}秒)` }
    }
    return { ok: false, message: '网络请求失败' }
  } finally {
    clearTimeout(timeout)
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- server/src/services/ai/__tests__/client.test.ts`
Expected: PASS，原 4 个 + 新 4 个 = 8 tests。

- [ ] **Step 5: Commit**

```bash
git add server/src/services/ai/client.ts server/src/services/ai/__tests__/client.test.ts
git commit -m "feat(server): add callAiProbe for connectivity testing"
```

---

### Task 4: env 插件改造为引导 config-store

**Files:**
- Modify: `server/src/plugins/env.ts`

移除标量 `aiConfig`，改为暴露 `configStore` 单例（已在 Task 2 创建）。config-store 构造时已完成首次引导，env 插件只需把它挂到 fastify 上。

- [ ] **Step 1: 改写 `env.ts`**

完整替换文件内容：

```ts
import type { FastifyPluginCallback } from 'fastify'
import fp from 'fastify-plugin'
import { configStore } from '../services/ai/config-store.js'

export const envPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.decorate('configStore', configStore)
  done()
}

// Use fastify-plugin to break encapsulation so configStore is visible to all children
export default fp(envPlugin, {
  name: 'env-plugin',
})

declare module 'fastify' {
  interface FastifyInstance {
    configStore: typeof configStore
  }
}
```

- [ ] **Step 2: 类型检查**

Run: `npm run typecheck --workspace=server`
Expected: 多处报错（`fastify.aiConfig` 在 `ai-status.ts`、`parse.ts`、`ai-config.ts` 还在用）——这是预期的，后续任务修复。记录报错文件，继续。

- [ ] **Step 3: 暂不提交**（等路由改造完一起提交，避免中间态编译失败）

---

### Task 5: ai-configs 路由（TDD）

**Files:**
- Create: `server/src/routes/ai-configs.ts`
- Test: `server/src/routes/__tests__/ai-configs.test.ts`
- Delete: `server/src/routes/ai-config.ts`

- [ ] **Step 1: 写失败测试 `ai-configs.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { envPlugin } from '../../plugins/env.js'
import { errorHandlerPlugin } from '../../plugins/error-handler.js'
import { aiConfigsRoute } from '../ai-configs.js'

let tmpDir: string

async function buildServer() {
  vi.resetModules()
  const fastify = Fastify()
  await fastify.register(cors, { origin: true })
  await fastify.register(envPlugin)
  await fastify.register(errorHandlerPlugin)
  fastify.register(aiConfigsRoute)
  return fastify
}

describe('AI configs routes', () => {
  let fastify: Awaited<ReturnType<typeof buildServer>>

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ai-route-'))
    process.env.AI_CONFIGS_PATH = join(tmpDir, 'ai-configs.json')
    delete process.env.AI_BASE_URL
    delete process.env.AI_API_KEY
    delete process.env.AI_MODEL
    fastify = await buildServer()
  })

  afterEach(async () => {
    await fastify.close()
    rmSync(tmpDir, { recursive: true, force: true })
    delete process.env.AI_CONFIGS_PATH
  })

  it('GET /configs returns views without apiKey', async () => {
    await fastify.inject({
      method: 'POST',
      url: '/api/ai/configs',
      payload: { name: 'A', baseUrl: 'https://a/v1', apiKey: 'sk-secret', model: 'm' },
    })

    const res = await fastify.inject({ method: 'GET', url: '/api/ai/configs' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.configs).toHaveLength(1)
    expect(body.configs[0].apiKey).toBeUndefined()
    expect(body.configs[0].hasApiKey).toBe(true)
    expect(body.activeId).toBeNull()
  })

  it('POST creates config', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/ai/configs',
      payload: { name: 'A', baseUrl: 'https://a/v1', apiKey: 'sk-1', model: 'm' },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.id).toBeTruthy()
    expect(body.name).toBe('A')
  })

  it('POST rejects missing apiKey', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/ai/configs',
      payload: { name: 'A', baseUrl: 'https://a/v1', model: 'm' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('PUT updates without changing apiKey when omitted', async () => {
    const created = await fastify.inject({
      method: 'POST',
      url: '/api/ai/configs',
      payload: { name: 'A', baseUrl: 'https://a/v1', apiKey: 'sk-orig', model: 'm' },
    })
    const id = JSON.parse(created.body).id

    const res = await fastify.inject({
      method: 'PUT',
      url: `/api/ai/configs/${id}`,
      payload: { name: 'A2', baseUrl: 'https://a/v1', model: 'm2' },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).name).toBe('A2')

    // 通过 GET 确认 hasApiKey 仍为 true
    const get = await fastify.inject({ method: 'GET', url: '/api/ai/configs' })
    expect(JSON.parse(get.body).configs[0].hasApiKey).toBe(true)
  })

  it('DELETE removes config', async () => {
    const created = await fastify.inject({
      method: 'POST',
      url: '/api/ai/configs',
      payload: { name: 'A', baseUrl: 'https://a/v1', apiKey: 'sk', model: 'm' },
    })
    const id = JSON.parse(created.body).id

    const res = await fastify.inject({ method: 'DELETE', url: `/api/ai/configs/${id}` })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).ok).toBe(true)
  })

  it('PUT /:id/active sets activeId', async () => {
    const created = await fastify.inject({
      method: 'POST',
      url: '/api/ai/configs',
      payload: { name: 'A', baseUrl: 'https://a/v1', apiKey: 'sk', model: 'm' },
    })
    const id = JSON.parse(created.body).id

    const res = await fastify.inject({ method: 'PUT', url: `/api/ai/configs/${id}/active` })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).activeId).toBe(id)
  })

  it('POST /:id/test returns ok:true on 2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'o' } }] }),
      }),
    )
    const created = await fastify.inject({
      method: 'POST',
      url: '/api/ai/configs',
      payload: { name: 'A', baseUrl: 'https://a/v1', apiKey: 'sk', model: 'm' },
    })
    const id = JSON.parse(created.body).id

    const res = await fastify.inject({ method: 'POST', url: `/api/ai/configs/${id}/test` })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual({ ok: true })
    vi.unstubAllGlobals()
  })

  it('POST /:id/test returns ok:false with message on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    const created = await fastify.inject({
      method: 'POST',
      url: '/api/ai/configs',
      payload: { name: 'A', baseUrl: 'https://a/v1', apiKey: 'sk', model: 'm' },
    })
    const id = JSON.parse(created.body).id

    const res = await fastify.inject({ method: 'POST', url: `/api/ai/configs/${id}/test` })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(false)
    expect(body.message).toContain('鉴权')
    vi.unstubAllGlobals()
  })

  it('POST /:id/test returns 404 for unknown id', async () => {
    const res = await fastify.inject({ method: 'POST', url: '/api/ai/configs/no-such/test' })
    expect(res.statusCode).toBe(404)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- server/src/routes/__tests__/ai-configs.test.ts`
Expected: FAIL，`Cannot find module '../ai-configs.js'`。

- [ ] **Step 3: 实现 `ai-configs.ts`**

```ts
import type { FastifyPluginCallback } from 'fastify'
import { callAiProbe } from '../services/ai/client.js'
import { AppError } from '../utils/errors.js'

const createSchema = {
  body: {
    type: 'object',
    required: ['name', 'baseUrl', 'apiKey', 'model'],
    properties: {
      name: { type: 'string' },
      baseUrl: { type: 'string' },
      apiKey: { type: 'string' },
      model: { type: 'string' },
    },
  },
}

const updateSchema = {
  body: {
    type: 'object',
    required: ['name', 'baseUrl', 'model'],
    properties: {
      name: { type: 'string' },
      baseUrl: { type: 'string' },
      apiKey: { type: 'string' },
      model: { type: 'string' },
    },
  },
}

function validateFields(name: string, baseUrl: string, model: string): void {
  if (!name.trim() || name.length > 30) {
    throw new AppError(400, '名称不能为空且不超过 30 字符')
  }
  if (!/^https?:\/\//.test(baseUrl)) {
    throw new AppError(400, 'Base URL 需以 http(s):// 开头')
  }
  if (!model.trim()) {
    throw new AppError(400, '模型名不能为空')
  }
}

export const aiConfigsRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get('/api/ai/configs', async () => {
    const snap = fastify.configStore.snapshot()
    return {
      configs: snap.configs.map((c) => ({
        id: c.id,
        name: c.name,
        baseUrl: c.baseUrl,
        model: c.model,
        hasApiKey: !!c.apiKey,
        available: c.available,
      })),
      activeId: snap.activeId,
    }
  })

  fastify.post('/api/ai/configs', { schema: createSchema }, async (request) => {
    const { name, baseUrl, apiKey, model } = request.body as {
      name: string
      baseUrl: string
      apiKey: string
      model: string
    }
    if (!apiKey.trim()) throw new AppError(400, '请填写 API Key')
    validateFields(name, baseUrl, model)
    const created = await fastify.configStore.create({
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
    })
    return { id: created.id, name: created.name, baseUrl: created.baseUrl, model: created.model }
  })

  fastify.put('/api/ai/configs/:id', { schema: updateSchema }, async (request) => {
    const { id } = request.params as { id: string }
    const { name, baseUrl, apiKey, model } = request.body as {
      name: string
      baseUrl: string
      apiKey?: string
      model: string
    }
    validateFields(name, baseUrl, model)
    const updated = await fastify.configStore.update(id, {
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey?.trim() || undefined,
      model: model.trim(),
    })
    if (!updated) throw new AppError(404, '配置不存在')
    return { id: updated.id, name: updated.name, baseUrl: updated.baseUrl, model: updated.model }
  })

  fastify.delete('/api/ai/configs/:id', async (request) => {
    const { id } = request.params as { id: string }
    const removed = await fastify.configStore.remove(id)
    if (!removed) throw new AppError(404, '配置不存在')
    return { ok: true }
  })

  fastify.put('/api/ai/configs/:id/active', async (request) => {
    const { id } = request.params as { id: string }
    const ok = await fastify.configStore.setActive(id)
    if (!ok) throw new AppError(404, '配置不存在')
    return { activeId: id }
  })

  fastify.post('/api/ai/configs/:id/test', async (request) => {
    const { id } = request.params as { id: string }
    const cfg = fastify.configStore.getById(id)
    if (!cfg) throw new AppError(404, '配置不存在')
    const result = await callAiProbe(
      { baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, model: cfg.model },
      15_000,
    )
    fastify.configStore.setAvailability(id, result.ok)
    return result
  })

  done()
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- server/src/routes/__tests__/ai-configs.test.ts`
Expected: PASS，9 tests。

- [ ] **Step 5: 删除旧 `ai-config.ts`**

```bash
git rm server/src/routes/ai-config.ts
```

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/ai-configs.ts server/src/routes/__tests__/ai-configs.test.ts
git commit -m "feat(server): add AI configs CRUD+active+test routes, remove old single-config route"
```

---

### Task 6: ai-status 与 plan/parse 改读 config-store

**Files:**
- Modify: `server/src/routes/ai-status.ts`
- Modify: `server/src/routes/plan/parse.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: 改写 `ai-status.ts`**

完整替换：

```ts
import type { FastifyPluginCallback } from 'fastify'

export const aiStatusRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get('/api/ai/status', async () => {
    const active = fastify.configStore.getActive()
    if (!active) {
      return { configured: false }
    }
    return {
      configured: true,
      model: active.model,
      available: active.available,
    }
  })

  done()
}
```

- [ ] **Step 2: 改写 `parse.ts` 第 12-18 行**

把 `const { aiConfig } = fastify` 到 `throw new AiNotConfiguredError()` 整段替换为：

```ts
    const active = fastify.configStore.getActive()

    if (!active || !active.baseUrl || !active.apiKey || !active.model) {
      throw new AiNotConfiguredError()
    }

    const aiConfig = { baseUrl: active.baseUrl, apiKey: active.apiKey, model: active.model }
```

注意：`aiConfig` 后续在 `callAi(aiConfig, prompt)` 处使用，保持变量名不变，最小改动。

- [ ] **Step 3: 更新 `index.ts` 路由注册**

把第 9-10 行的 import：

```ts
import { aiStatusRoute } from './routes/ai-status.js'
import { aiConfigRoute } from './routes/ai-config.js'
```

替换为：

```ts
import { aiStatusRoute } from './routes/ai-status.js'
import { aiConfigsRoute } from './routes/ai-configs.js'
```

把第 28-29 行的注册：

```ts
  fastify.register(aiStatusRoute)
  fastify.register(aiConfigRoute)
```

替换为：

```ts
  fastify.register(aiStatusRoute)
  fastify.register(aiConfigsRoute)
```

- [ ] **Step 4: 更新 `parse.test.ts` 中设置环境变量的方式**

`parse.test.ts` 现有测试通过 `process.env.AI_*` 让 `envPlugin` 读取标量字段，现改为通过 `AI_CONFIGS_PATH` 指向临时文件并先注入配置。在文件顶部 import 区追加：

```ts
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
```

把 `buildTestServer` 改为接受一个可选的 `seedConfig`，并在 `beforeEach`/`afterEach` 管理临时路径。具体：

替换 `async function buildTestServer()` 整个函数为：

```ts
let tmpDir: string

async function buildTestServer(seed?: { baseUrl: string; apiKey: string; model: string }) {
  tmpDir = mkdtempSync(join(tmpdir(), 'parse-'))
  process.env.AI_CONFIGS_PATH = join(tmpDir, 'ai-configs.json')
  delete process.env.AI_BASE_URL
  delete process.env.AI_API_KEY
  delete process.env.AI_MODEL
  if (seed) {
    writeFileSync(
      process.env.AI_CONFIGS_PATH,
      JSON.stringify({
        configs: [
          {
            id: 'test-active',
            name: '默认',
            baseUrl: seed.baseUrl,
            apiKey: seed.apiKey,
            model: seed.model,
            available: null,
          },
        ],
        activeId: 'test-active',
      }),
    )
  }
  const fastify = Fastify()
  await fastify.register(cors, { origin: true })
  await fastify.register(multipart)
  await fastify.register(envPlugin)
  await fastify.register(errorHandlerPlugin)
  fastify.register(planParseRoute)
  return fastify
}
```

在 `afterEach`（原 `await fastify.close()` 那个）追加：

```ts
  rmSync(tmpDir, { recursive: true, force: true })
  delete process.env.AI_CONFIGS_PATH
```

把"should reject empty content"、"whitespace-only"、"100K chars"三个用例里设置 `process.env.AI_*` 然后 `buildTestServer()` 的部分，改为 `buildTestServer({ baseUrl: 'https://api.test.com/v1', apiKey: 'test-key', model: 'test-model' })`，并删除这些用例里的 `process.env.AI_*` 赋值和对应 `finally` 里的 `delete process.env.AI_*`。

"should reject when AI is not configured (503)" 用例保持 `buildTestServer()`（无 seed），断言不变。

- [ ] **Step 5: 类型检查与测试**

Run: `npm run typecheck --workspace=server && npm test -- server/src/routes/__tests__/parse.test.ts server/src/routes/__tests__/extract.test.ts`
Expected: typecheck PASS，parse 测试 4 个全过，extract 测试不受影响。

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/ai-status.ts server/src/routes/plan/parse.ts server/src/index.ts server/src/routes/__tests__/parse.test.ts
git commit -m "refactor(server): routes read active config from config-store"
```

---

### Task 7: 把 ai-configs.json 加入 .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: 追加规则**

在 `.gitignore` 末尾追加一行：

```
server/ai-configs.json
```

- [ ] **Step 2: 确认未被追踪**

Run: `git check-ignore server/ai-configs.json`
Expected: 输出 `server/ai-configs.json`（表示已被忽略）。

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore server/ai-configs.json runtime file"
```

---

### Task 8: 前端 api-client 配置接口

**Files:**
- Modify: `client/src/services/api-client.ts`

- [ ] **Step 1: 替换文件内容**

完整替换（移除旧 `AiConfigRequest` 本地定义，改用 shared 类型，新增六个函数）：

```ts
import type {
  ExtractResponse,
  ParsePlanRequest,
  ParsePlanResponse,
  AiStatusResponse,
  AiConfigsResponse,
  AiConfigView,
  AiConfigRequest,
  AiConfigTestResponse,
} from '@autumn-recruitment/shared'

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || body.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function extractFile(file: File): Promise<ExtractResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/plan/extract`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function parsePlan(data: ParsePlanRequest): Promise<ParsePlanResponse> {
  return request<ParsePlanResponse>('/plan/parse', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getAiStatus(): Promise<AiStatusResponse> {
  return request<AiStatusResponse>('/ai/status')
}

export async function getAiConfigs(): Promise<AiConfigsResponse> {
  return request<AiConfigsResponse>('/ai/configs')
}

export async function createAiConfig(data: AiConfigRequest): Promise<AiConfigView> {
  return request<AiConfigView>('/ai/configs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAiConfig(id: string, data: AiConfigRequest): Promise<AiConfigView> {
  return request<AiConfigView>(`/ai/configs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteAiConfig(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/ai/configs/${id}`, { method: 'DELETE' })
}

export async function setActiveAiConfig(id: string): Promise<{ activeId: string }> {
  return request<{ activeId: string }>(`/ai/configs/${id}/active`, { method: 'PUT' })
}

export async function testAiConfig(id: string): Promise<AiConfigTestResponse> {
  return request<AiConfigTestResponse>(`/ai/configs/${id}/test`, { method: 'POST' })
}
```

- [ ] **Step 2: 类型检查**

Run: `npm run typecheck --workspace=client`
Expected: `settings-context.tsx` 与 `AiStatus.tsx` 报错（还在用旧的 `updateAiConfig` 签名和旧类型），后续任务修复。

- [ ] **Step 3: 暂不提交**（等前端 context + 组件改完一起提交）

---

### Task 9: SettingsContext 多配置状态与方法（TDD）

**Files:**
- Modify: `client/src/contexts/settings-context.tsx`

- [ ] **Step 1: 改写 `settings-context.tsx`**

完整替换：

```ts
import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react'
import { backupDal } from '../dal/backup.dal'
import {
  getAiStatus,
  getAiConfigs,
  createAiConfig,
  updateAiConfig,
  deleteAiConfig,
  setActiveAiConfig,
  testAiConfig,
} from '../services/api-client'
import type {
  BackupEnvelope,
  AiConfigView,
  AiConfigRequest,
  AiConfigsResponse,
} from '@autumn-recruitment/shared'
import { BackupEnvelopeSchema } from '@autumn-recruitment/shared'

// -- State type --
interface SettingsState {
  aiConfigs: AiConfigView[]
  activeId: string | null
  loading: boolean
  error: string | null
}

// -- Actions --
type SettingsAction =
  | { type: 'SET_CONFIGS'; payload: AiConfigsResponse }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_CONFIG'; payload: AiConfigView }
  | { type: 'REMOVE_CONFIG'; payload: string }
  | { type: 'SET_ACTIVE'; payload: string }
  | { type: 'SET_AVAILABILITY'; payload: { id: string; available: boolean | null } }

// -- Initial state --
const initialState: SettingsState = {
  aiConfigs: [],
  activeId: null,
  loading: false,
  error: null,
}

// -- Reducer --
function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_CONFIGS':
      return {
        ...state,
        aiConfigs: action.payload.configs,
        activeId: action.payload.activeId,
        loading: false,
        error: null,
      }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'UPDATE_CONFIG':
      return {
        ...state,
        aiConfigs: state.aiConfigs.map((c) => (c.id === action.payload.id ? action.payload : c)),
      }
    case 'REMOVE_CONFIG':
      return {
        ...state,
        aiConfigs: state.aiConfigs.filter((c) => c.id !== action.payload),
        activeId: state.activeId === action.payload ? null : state.activeId,
      }
    case 'SET_ACTIVE':
      return { ...state, activeId: action.payload }
    case 'SET_AVAILABILITY':
      return {
        ...state,
        aiConfigs: state.aiConfigs.map((c) =>
          c.id === action.payload.id ? { ...c, available: action.payload.available } : c,
        ),
      }
    default:
      return state
  }
}

// -- Context value type --
interface SettingsContextValue {
  state: SettingsState
  loadConfigs: () => Promise<void>
  createConfig: (data: AiConfigRequest) => Promise<void>
  updateConfig: (id: string, data: AiConfigRequest) => Promise<void>
  deleteConfig: (id: string) => Promise<void>
  setActive: (id: string) => Promise<void>
  testConfig: (id: string) => Promise<void>
  exportBackup: () => Promise<void>
  importBackup: (file: File) => Promise<BackupEnvelope>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

// -- Provider --
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(settingsReducer, initialState)

  const loadConfigs = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const data = await getAiConfigs()
      dispatch({ type: 'SET_CONFIGS', payload: data })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : '加载 AI 配置失败',
      })
    }
  }, [])

  const createConfig = useCallback(async (data: AiConfigRequest) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      await createAiConfig(data)
      const refreshed = await getAiConfigs()
      dispatch({ type: 'SET_CONFIGS', payload: refreshed })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : '创建配置失败',
      })
      throw err
    }
  }, [])

  const updateConfig = useCallback(async (id: string, data: AiConfigRequest) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const updated = await updateAiConfig(id, data)
      dispatch({ type: 'UPDATE_CONFIG', payload: updated })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : '更新配置失败',
      })
      throw err
    }
  }, [])

  const deleteConfig = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      await deleteAiConfig(id)
      dispatch({ type: 'REMOVE_CONFIG', payload: id })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : '删除配置失败',
      })
      throw err
    }
  }, [])

  const setActive = useCallback(async (id: string) => {
    try {
      await setActiveAiConfig(id)
      dispatch({ type: 'SET_ACTIVE', payload: id })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : '设置激活配置失败',
      })
      throw err
    }
  }, [])

  const testConfig = useCallback(async (id: string) => {
    // 测试不设全局 loading，由组件按 id 控制 loading
    try {
      const result = await testAiConfig(id)
      dispatch({ type: 'SET_AVAILABILITY', payload: { id, available: result.ok ? true : false } })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : '连通测试失败',
      })
    }
  }, [])

  // Load configs on mount
  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  const exportBackup = useCallback(async () => {
    const envelope = await backupDal.exportAll()
    const json = JSON.stringify(envelope, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `autumn-recruitment-backup-${envelope.exportedAt.slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const importBackup = useCallback(async (file: File): Promise<BackupEnvelope> => {
    const text = await file.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error('无效的 JSON 文件')
    }

    const result = BackupEnvelopeSchema.safeParse(parsed)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join('; ')
      throw new Error(`备份文件格式无效: ${messages}`)
    }

    const envelope = result.data
    const { tasks, taskDrafts, planImports, applications, leetCodeProblems } = envelope.data
    const summary = [
      `任务: ${tasks.length}`,
      `任务草稿: ${taskDrafts.length}`,
      `计划导入: ${planImports.length}`,
      `岗位投递: ${applications.length}`,
      `LeetCode 题目: ${leetCodeProblems.length}`,
    ].join(', ')

    const confirmed = window.confirm(
      `确认导入备份？当前数据将被替换。\n\n备份摘要:\n${summary}\n\n导出时间: ${envelope.exportedAt}\n版本: ${envelope.schemaVersion}`,
    )
    if (!confirmed) {
      throw new Error('用户取消导入')
    }

    await backupDal.importBackup(envelope)
    return envelope
  }, [])

  return (
    <SettingsContext.Provider
      value={{
        state,
        loadConfigs,
        createConfig,
        updateConfig,
        deleteConfig,
        setActive,
        testConfig,
        exportBackup,
        importBackup,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

// -- Hook --
export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (ctx == null) {
    throw new Error('useSettingsContext must be used within a SettingsProvider')
  }
  return ctx
}
```

- [ ] **Step 2: 类型检查**

Run: `npm run typecheck --workspace=client`
Expected: `AiStatus.tsx` 仍报错（还在用旧 `state` 字段 `aiConfigured`/`aiModel`/`checkAiStatus`/`updateAiConfig`），下个任务修复。

- [ ] **Step 3: 暂不提交**

---

### Task 10: AiConfigForm 组件（TDD）

**Files:**
- Create: `client/src/pages/settings/components/AiConfigForm.tsx`
- Create: `client/src/pages/settings/components/AiConfigForm.module.css`
- Test: `client/src/pages/settings/components/__tests__/AiConfigForm.test.tsx`

- [ ] **Step 1: 写失败测试 `AiConfigForm.test.tsx`**

```ts
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AiConfigForm from '../AiConfigForm'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

// AiConfigForm 不依赖 context，onSubmit 由 props 注入
function render(props: Parameters<typeof AiConfigForm>[0]) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  let submitted: any = undefined
  act(() => {
    root.render(
      <AiConfigForm
        {...props}
        onSubmit={async (data) => {
          submitted = data
        }}
      />,
    )
  })
  return {
    container,
    root,
    submitted: () => submitted,
    setSubmitted: (v: any) => (submitted = v),
  }
}

describe('AiConfigForm', () => {
  let cases: ReturnType<typeof render>[]

  beforeEach(() => {
    cases = []
  })

  afterEach(async () => {
    for (const c of cases) {
      await act(async () => {
        c.root.unmount()
      })
      c.container.remove()
    }
  })

  it('new mode: shows empty fields with sk-... placeholder and default model', () => {
    const c = render({ isOpen: true, onClose: () => {}, editing: null })
    cases.push(c)

    const inputs = c.container.querySelectorAll('input')
    const nameInput = inputs[0] as HTMLInputElement
    const urlInput = inputs[1] as HTMLInputElement
    const keyInput = inputs[2] as HTMLInputElement
    const modelInput = inputs[3] as HTMLInputElement

    expect(nameInput.value).toBe('')
    expect(urlInput.value).toBe('https://api.deepseek.com/v1')
    expect(keyInput.value).toBe('')
    expect(keyInput.placeholder).toContain('sk-')
    expect(modelInput.value).toBe('deepseek-v4-flash')
  })

  it('edit mode: prefills name/url/model, leaves key empty with 不修改 placeholder', () => {
    const c = render({
      isOpen: true,
      onClose: () => {},
      editing: {
        id: '1',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-v4-flash',
        hasApiKey: true,
        available: null,
      },
    })
    cases.push(c)

    const inputs = c.container.querySelectorAll('input')
    expect((inputs[0] as HTMLInputElement).value).toBe('DeepSeek')
    expect((inputs[1] as HTMLInputElement).value).toBe('https://api.deepseek.com/v1')
    expect((inputs[2] as HTMLInputElement).value).toBe('')
    expect((inputs[2] as HTMLInputElement).placeholder).toContain('不修改')
    expect((inputs[3] as HTMLInputElement).value).toBe('deepseek-v4-flash')
  })

  it('edit mode submit with empty key omits apiKey', async () => {
    const c = render({
      isOpen: true,
      onClose: () => {},
      editing: {
        id: '1',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-v4-flash',
        hasApiKey: true,
        available: null,
      },
    })
    cases.push(c)

    const form = c.container.querySelector('form')!
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(c.submitted()).toEqual({
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-flash',
    })
    expect(c.submitted().apiKey).toBeUndefined()
  })

  it('new mode submit with key includes apiKey', async () => {
    const c = render({ isOpen: true, onClose: () => {}, editing: null })
    cases.push(c)

    const inputs = c.container.querySelectorAll('input')
    ;(inputs[0] as HTMLInputElement).value = 'A'
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
    ;(inputs[2] as HTMLInputElement).value = 'sk-new'
    inputs[2].dispatchEvent(new Event('input', { bubbles: true }))

    const form = c.container.querySelector('form')!
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(c.submitted().apiKey).toBe('sk-new')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- client/src/pages/settings/components/__tests__/AiConfigForm.test.tsx`
Expected: FAIL，找不到 `AiConfigForm`。

- [ ] **Step 3: 实现 `AiConfigForm.tsx`**

```ts
import { useState, type FormEvent } from 'react'
import type { AiConfigView, AiConfigRequest } from '@autumn-recruitment/shared'
import { Drawer, Button, FormField } from '../../../components'
import styles from './AiConfigForm.module.css'

interface AiConfigFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AiConfigRequest) => Promise<void>
  editing: AiConfigView | null
}

const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1'
const DEFAULT_MODEL = 'deepseek-v4-flash'

export default function AiConfigForm({ isOpen, onClose, onSubmit, editing }: AiConfigFormProps) {
  const isEditing = editing != null
  const [name, setName] = useState(editing?.name ?? '')
  const [baseUrl, setBaseUrl] = useState(editing?.baseUrl ?? DEFAULT_BASE_URL)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(editing?.model ?? DEFAULT_MODEL)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = '请输入名称'
    if (!/^https?:\/\//.test(baseUrl.trim())) next.baseUrl = 'Base URL 需以 http(s):// 开头'
    if (!model.trim()) next.model = '请输入模型名'
    if (!isEditing && !apiKey.trim()) next.apiKey = '请填写 API Key'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const data: AiConfigRequest = {
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        model: model.trim(),
      }
      if (apiKey.trim()) data.apiKey = apiKey.trim()
      await onSubmit(data)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? '编辑配置' : '新增配置'}
      width={480}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <FormField label="名称" required error={errors.name} htmlFor="ai-name">
          <input
            id="ai-name"
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：DeepSeek 官方"
          />
        </FormField>
        <FormField label="API Base URL" required error={errors.baseUrl} htmlFor="ai-baseurl">
          <input
            id="ai-baseurl"
            className={styles.input}
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.deepseek.com/v1"
          />
        </FormField>
        <FormField
          label="API Key"
          required={!isEditing}
          error={errors.apiKey}
          htmlFor="ai-apikey"
        >
          <input
            id="ai-apikey"
            className={styles.input}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={isEditing ? '留空表示不修改' : 'sk-...'}
          />
        </FormField>
        <FormField label="Model" required error={errors.model} htmlFor="ai-model">
          <input
            id="ai-model"
            className={styles.input}
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="deepseek-v4-flash"
          />
        </FormField>
        <div className={styles.actions}>
          <Button variant="default" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            {isEditing ? '保存修改' : '新增配置'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
```

- [ ] **Step 4: 实现 `AiConfigForm.module.css`**

复用 `ApplicationForm.module.css` 的同类样式风格。先查看该文件结构后对齐：

Run: `cat client/src/pages/applications/components/ApplicationForm.module.css`

按其 `.form` / `.input` / `.textarea` / `.actions` 等类名编写。若 `ApplicationForm.module.css` 用了 `.formGroup` 等，这里只取所需子集：

```css
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-bg-white);
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.input:focus {
  border-color: var(--color-primary, #4f46e5);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
```

如果 `ApplicationForm.module.css` 有 `box-sizing`/`width: 100%` 等细节差异，对齐之，保证表单在 Drawer 内宽度正常。

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- client/src/pages/settings/components/__tests__/AiConfigForm.test.tsx`
Expected: PASS，4 tests。

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/settings/components/AiConfigForm.tsx client/src/pages/settings/components/AiConfigForm.module.css client/src/pages/settings/components/__tests__/AiConfigForm.test.tsx
git commit -m "feat(client): add AiConfigForm with edit-mode key preservation"
```

---

### Task 11: AiConfigList 组件（TDD）

**Files:**
- Create: `client/src/pages/settings/components/AiConfigList.tsx`
- Create: `client/src/pages/settings/components/AiConfigList.module.css`
- Test: `client/src/pages/settings/components/__tests__/AiConfigList.test.tsx`

- [ ] **Step 1: 写失败测试 `AiConfigList.test.tsx`**

```ts
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AiConfigList from '../AiConfigList'
import type { AiConfigView } from '@autumn-recruitment/shared'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../../../contexts', () => ({
  useSettingsContext: () => ({
    state: {
      aiConfigs: [
        { id: 'a', name: 'DeepSeek', baseUrl: 'https://a/v1', model: 'deepseek-v4-flash', hasApiKey: true, available: true },
        { id: 'b', name: 'OpenAI', baseUrl: 'https://b/v1', model: 'gpt-4o-mini', hasApiKey: true, available: null },
      ] as AiConfigView[],
      activeId: 'a',
      loading: false,
      error: null,
    },
    setActive: vi.fn().mockResolvedValue(undefined),
    testConfig: vi.fn().mockResolvedValue(undefined),
    deleteConfig: vi.fn().mockResolvedValue(undefined),
  }),
}))

function render() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      <AiConfigList
        onEdit={() => {}}
        onNew={() => {}}
      />,
    )
  })
  return { container, root }
}

describe('AiConfigList', () => {
  let renders: { container: HTMLDivElement; root: Root }[]

  beforeEach(() => {
    renders = []
  })

  afterEach(async () => {
    for (const r of renders) {
      await act(async () => {
        r.root.unmount()
      })
      r.container.remove()
    }
  })

  it('active row shows no 设为当前 button, inactive row does', () => {
    const { container, root } = render()
    renders.push({ container, root })

    const buttons = Array.from(container.querySelectorAll('button')).map((b) =>
      b.textContent?.trim(),
    )
    // 激活行 a 不应出现"设为当前"，非激活行 b 应出现
    expect(buttons).not.toContain('设为当前')
    expect(buttons).toContain('设为当前')
  })

  it('clicking test calls testConfig with id', async () => {
    const { container, root } = render()
    renders.push({ container, root })

    const testButtons = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === '测试',
    )
    await act(async () => {
      testButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const { useSettingsContext } = await import('../../../../contexts')
    expect((useSettingsContext as any).testConfig).toHaveBeenCalled()
  })

  it('delete active row shows confirmation mentioning 正在使用', async () => {
    const { container, root } = render()
    renders.push({ container, root })

    // 激活行 a 的删除按钮是第一个"删除"
    const deleteButtons = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === '删除',
    )
    await act(async () => {
      deleteButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const dialogText = document.body.textContent ?? ''
    expect(dialogText).toContain('正在使用')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- client/src/pages/settings/components/__tests__/AiConfigList.test.tsx`
Expected: FAIL，找不到 `AiConfigList`。

- [ ] **Step 3: 实现 `AiConfigList.tsx`**

```ts
import { useState } from 'react'
import type { AiConfigView } from '@autumn-recruitment/shared'
import { useSettingsContext } from '../../../contexts'
import { Button, Badge, ConfirmDialog, showToast } from '../../../components'
import styles from './AiConfigList.module.css'

interface AiConfigListProps {
  onEdit: (config: AiConfigView) => void
  onNew: () => void
}

function AvailabilityBadge({ available }: { available: boolean | null }) {
  if (available === true) return <Badge variant="success">可用</Badge>
  if (available === false) return <Badge variant="danger">不可用</Badge>
  return <Badge variant="default">未测试</Badge>
}

export default function AiConfigList({ onEdit, onNew }: AiConfigListProps) {
  const { state, setActive, testConfig, deleteConfig } = useSettingsContext()
  const { aiConfigs, activeId } = state
  const [testingId, setTestingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AiConfigView | null>(null)

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      await testConfig(id)
    } finally {
      setTestingId(null)
    }
  }

  const handleSetActive = async (id: string) => {
    try {
      await setActive(id)
      showToast('success', '已切换当前配置')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '切换失败')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deleteConfig(deleteTarget.id)
      showToast('success', '配置已删除')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeleteTarget(null)
    }
  }

  const isActive = (id: string) => id === activeId

  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>AI 配置</span>
        <Button variant="primary" size="small" onClick={onNew}>
          + 新增配置
        </Button>
      </div>

      {aiConfigs.length === 0 ? (
        <p className={styles.empty}>暂无配置，点击「新增配置」添加。</p>
      ) : (
        <ul className={styles.items}>
          {aiConfigs.map((cfg) => (
            <li key={cfg.id} className={styles.item}>
              <span className={styles.radio}>{isActive(cfg.id) ? '◉' : '○'}</span>
              <div className={styles.info}>
                <span className={styles.name}>{cfg.name}</span>
                <span className={styles.model}>{cfg.model}</span>
              </div>
              <div className={styles.badgeCell}>
                <AvailabilityBadge available={cfg.available} />
              </div>
              <div className={styles.actions}>
                {!isActive(cfg.id) && (
                  <Button variant="text" size="small" onClick={() => handleSetActive(cfg.id)}>
                    设为当前
                  </Button>
                )}
                <Button
                  variant="text"
                  size="small"
                  loading={testingId === cfg.id}
                  onClick={() => handleTest(cfg.id)}
                >
                  测试
                </Button>
                <Button variant="text" size="small" onClick={() => onEdit(cfg)}>
                  编辑
                </Button>
                <Button variant="text" size="small" onClick={() => setDeleteTarget(cfg)}>
                  删除
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="确认删除"
        message={
          deleteTarget
            ? isActive(deleteTarget.id)
              ? `「${deleteTarget.name}」当前正在使用，删除后将变为未配置。确定删除吗？`
              : `确定要删除配置「${deleteTarget.name}」吗？`
            : ''
        }
        confirmLabel="删除"
        confirmVariant="danger"
      />
    </div>
  )
}
```

- [ ] **Step 4: 实现 `AiConfigList.module.css`**

```css
.list {
  margin-top: 12px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.headerTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.empty {
  font-size: 14px;
  color: var(--color-text-secondary);
  padding: 12px 0;
}

.items {
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
}

.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.item:last-child {
  border-bottom: none;
}

.radio {
  font-size: 16px;
  color: var(--color-primary, #4f46e5);
  width: 16px;
  flex-shrink: 0;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.model {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.badgeCell {
  flex-shrink: 0;
}

.actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- client/src/pages/settings/components/__tests__/AiConfigList.test.tsx`
Expected: PASS，3 tests。

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/settings/components/AiConfigList.tsx client/src/pages/settings/components/AiConfigList.module.css client/src/pages/settings/components/__tests__/AiConfigList.test.tsx
git commit -m "feat(client): add AiConfigList with active selection and test actions"
```

---

### Task 12: AiStatus 顶部概览 + 展开列表

**Files:**
- Modify: `client/src/pages/settings/components/AiStatus.tsx`
- Modify: `client/src/pages/settings/components/AiStatus.module.css`

- [ ] **Step 1: 改写 `AiStatus.tsx`**

```ts
import { useState } from 'react'
import { useSettingsContext } from '../../../contexts'
import { Button, Badge } from '../../../components'
import type { AiConfigView } from '@autumn-recruitment/shared'
import AiConfigList from './AiConfigList'
import AiConfigForm from './AiConfigForm'
import styles from './AiStatus.module.css'

function AvailabilityBadge({ available }: { available: boolean | null }) {
  if (available === true) return <Badge variant="success">可用 ✓</Badge>
  if (available === false) return <Badge variant="danger">不可用</Badge>
  return <Badge variant="default">未测试</Badge>
}

export default function AiStatus() {
  const { state, loadConfigs, createConfig, updateConfig } = useSettingsContext()
  const { aiConfigs, activeId, loading } = state
  const [showList, setShowList] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AiConfigView | null>(null)

  const active = aiConfigs.find((c) => c.id === activeId) ?? null

  const handleNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const handleEdit = (cfg: AiConfigView) => {
    setEditing(cfg)
    setFormOpen(true)
  }

  const handleSubmit = async (data: Parameters<typeof updateConfig>[1]) => {
    if (editing) {
      await updateConfig(editing.id, data)
    } else {
      await createConfig(data)
    }
    setFormOpen(false)
    setEditing(null)
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>AI 服务状态</h2>

      <div className={styles.statusRow}>
        <div className={styles.statusInfo}>
          {active ? (
            <>
              <Badge variant="success">已配置</Badge>
              <span className={styles.modelName}>
                {active.name} · {active.model}
              </span>
              <AvailabilityBadge available={active.available} />
            </>
          ) : (
            <Badge variant="danger">未配置</Badge>
          )}
        </div>
        <div className={styles.statusActions}>
          <Button variant="default" size="small" loading={loading} onClick={loadConfigs}>
            刷新状态
          </Button>
          <Button variant="default" size="small" onClick={() => setShowList((v) => !v)}>
            {showList ? '收起' : '编辑配置'}
          </Button>
        </div>
      </div>

      {showList && <AiConfigList onEdit={handleEdit} onNew={handleNew} />}

      <AiConfigForm
        key={editing?.id ?? 'new'}
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
        editing={editing}
      />
    </section>
  )
}
```

- [ ] **Step 2: 调整 `AiStatus.module.css`**

保留现有 `.section` / `.sectionTitle` / `.statusRow` / `.statusInfo` / `.modelName` / `.statusActions`。删除旧的 `.instructions` / `.codeBlock` / `.form` / `.field` / `.label` / `.input` / `.formActions`（已迁移到 `AiConfigList` 和 `AiConfigForm`）。确认 `.statusInfo` 为：

```css
.statusInfo {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
```

（改为 `flex-direction: row` 让已配置时的徽章和文字横排。）

- [ ] **Step 3: 类型检查**

Run: `npm run typecheck --workspace=client`
Expected: PASS。若 `AiStatus.module.css` 删除的类被其他文件引用会报错——这些类仅 `AiStatus.tsx` 用，确认无外部引用。

- [ ] **Step 4: 运行全部前端测试**

Run: `npm test -- client`
Expected: PASS（含 DashboardPage 现有 3 个 + AiConfigForm 4 个 + AiConfigList 3 个）。

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/settings/components/AiStatus.tsx client/src/pages/settings/components/AiStatus.module.css
git commit -m "feat(client): AiStatus overview with availability badge and config list"
```

---

### Task 13: 修复岗位投递编辑表单回显

**Files:**
- Modify: `client/src/pages/applications/ApplicationsPage.tsx`

- [ ] **Step 1: 给 `ApplicationForm` 加 `key`**

把 `ApplicationsPage.tsx` 第 195-200 行的：

```tsx
      <ApplicationForm
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleSubmitForm}
        editing={editingApp}
      />
```

替换为：

```tsx
      <ApplicationForm
        key={editingApp?.id ?? 'new'}
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleSubmitForm}
        editing={editingApp}
      />
```

- [ ] **Step 2: 清理 `handleSubmitForm` 中无意义的表单重置**

`ApplicationForm` 的 `handleSubmit` 里有 `setForm({ ...EMPTY_FORM })`（第 98 行附近）。由于加了 `key` 后关闭 Drawer 即卸载，这行已无意义但无害——按"精准修改"原则，本任务不修改 `ApplicationForm.tsx`，只加 `key`。若 reviewer 认为应清理，单独处理。

（本任务无新测试：`key` 重挂机制使 `ApplicationForm` 现有的 `useState(() => editing ? ... : EMPTY_FORM)` 初始化逻辑在每次打开编辑时重新执行，行为已被现有初始化逻辑覆盖。手动验证见 Task 15。）

- [ ] **Step 3: 类型检查**

Run: `npm run typecheck --workspace=client`
Expected: PASS。

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/applications/ApplicationsPage.tsx
git commit -m "fix(client): remount ApplicationForm on edit to prefill existing values"
```

---

### Task 14: 全量验证

**Files:** 无（仅验证）

- [ ] **Step 1: 全量类型检查**

Run: `npm run typecheck`
Expected: shared / client / server 全部 PASS。

- [ ] **Step 2: 全量测试**

Run: `npm test`
Expected: 所有测试 PASS。预期测试总数 ≈ 原 59 + config-store 9 + client probe 4 + ai-configs 9 + AiConfigForm 4 + AiConfigList 3 = 88。

- [ ] **Step 3: 构建**

Run: `npm run build`
Expected: shared / client / server 全部构建成功。

- [ ] **Step 4: 若有失败，逐项修复后回到 Step 1**

---

### Task 15: 手动验证清单

启动应用手动确认端到端行为：

- [ ] **Step 1: 启动**

Run: `npm run dev`（前后端同时启动）

- [ ] **Step 2: 首次引导**

确认 `server/ai-configs.json` 不存在时，若 `.env` 三项齐全则生成"默认"配置并激活；若 `.env` 缺 key 则显示"未配置"。

- [ ] **Step 3: 新增配置**

设置页 → 编辑配置 → + 新增配置：填名称/URL/Key/Model，保存后列表出现该配置，Model 默认显示 `deepseek-v4-flash`。

- [ ] **Step 4: 编辑配置回显**

点某配置"编辑"：名称/URL/Model 回显当前值，Key 框为空且占位符"留空表示不修改"。改名称保存，列表更新；不填 Key 保存，`hasApiKey` 仍为 true（可再次编辑确认 key 未丢）。

- [ ] **Step 5: 连通测试**

点"测试"：填了真实 DeepSeek key 的配置显示"可用"；故意填错 key 的显示"不可用"+ 消息含"鉴权"。

- [ ] **Step 6: 激活切换**

非激活配置点"设为当前"→ 顶部概览切换为该配置名/model，激活行显示 `◉` 且无"设为当前"按钮。

- [ ] **Step 7: 删除激活配置**

删当前激活配置 → 确认弹窗含"正在使用"→ 确认后顶部变"未配置"。

- [ ] **Step 8: 岗位投递编辑回显**

岗位投递页 → 点某条"编辑"→ Drawer 表单显示该条公司/岗位/状态等旧值；关闭后点另一条"编辑"→ 显示新条目值，不是上次残留。

- [ ] **Step 9: AI 生成任务可用**

确认激活配置可用后，导入计划文档触发 AI 拆解任务，能正常返回草稿（验证 `plan/parse` 改读 config-store 后端到端正常）。

- [ ] **Step 10: 停止服务**

`Ctrl+C` 停止。确认 `server/ai-configs.json` 已被 git 忽略（`git status` 不显示它）。
