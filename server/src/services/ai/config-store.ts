import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

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

// 磁盘形状：不含 available（available 仅缓存于内存，不落盘）
interface OnDiskEntry {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  model: string
}

interface OnDiskStore {
  configs: OnDiskEntry[]
  activeId: string | null
}

// 基于当前文件位置解析，避免受运行时 cwd 影响。
// 本文件位于 server/src/services/ai/config-store.ts，目标为 server/ai-configs.json，
// 相对深度为 ../../../（../../ 会错误落到 server/src/）。
const DEFAULT_PATH = fileURLToPath(new URL('../../../ai-configs.json', import.meta.url))

function resolvePath(): string {
  return process.env.AI_CONFIGS_PATH || DEFAULT_PATH
}

function emptyStore(): StoreShape {
  return { configs: [], activeId: null }
}

function readDisk(path: string): StoreShape | null {
  if (!existsSync(path)) return null
  let raw: string
  try {
    raw = readFileSync(path, 'utf-8')
  } catch (err) {
    // 文件存在但无法读取：视为损坏，不静默清空，避免 apiKey 永久丢失
    console.error(`[config-store] 无法读取 ${path}：`, err instanceof Error ? err.message : err)
    throw new Error('配置存储文件无法读取，请手动修复或删除 server/ai-configs.json 后重启')
  }
  try {
    const parsed = JSON.parse(raw) as StoreShape
    // configs 非数组（含空数组）视为形状无效/空存储；空但有效的 {configs:[]} 走 emptyStore
    if (!parsed || !Array.isArray(parsed.configs)) return emptyStore()
    // available 仅存在于内存，磁盘读取时补齐为 null
    parsed.configs = parsed.configs.map((c) => ({ ...c, available: c.available ?? null }))
    return parsed
  } catch (err) {
    // 解析失败（含崩溃写入产生的空字符串等）：损坏，必须显式失败
    console.error(`[config-store] 配置文件解析失败 ${path}：`, err instanceof Error ? err.message : err)
    throw new Error('配置存储文件已损坏，请手动修复或删除 server/ai-configs.json 后重启')
  }
}

function writeDisk(path: string, store: StoreShape): void {
  mkdirSync(dirname(path), { recursive: true })
  // available 仅缓存于内存，不落盘
  const onDisk: OnDiskStore = {
    configs: store.configs.map((c) => ({
      id: c.id,
      name: c.name,
      baseUrl: c.baseUrl,
      apiKey: c.apiKey,
      model: c.model,
    })),
    activeId: store.activeId,
  }
  // 原子写：临时文件 + rename，避免写入中途崩溃产生损坏文件
  const tmpPath = `${path}.tmp`
  writeFileSync(tmpPath, JSON.stringify(onDisk, null, 2), 'utf-8')
  renameSync(tmpPath, path)
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
    // 文件缺失或 configs 为空时从 .env 播种（即便空文件已存在）
    if (disk && disk.configs.length > 0) {
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

  /**
   * 返回所有配置的深拷贝（含 apiKey）。
   * 注意：apiKey 仅供服务端使用，HTTP 出口必须剥离为 AiConfigView（仅 hasApiKey）。
   */
  snapshot(): StoreShape {
    return {
      configs: this.store.configs.map((c) => ({ ...c })),
      activeId: this.store.activeId,
    }
  }

  getActive(): AiConfigEntry | null {
    if (!this.store.activeId) return null
    const cfg = this.store.configs.find((c) => c.id === this.store.activeId)
    return cfg ? { ...cfg } : null
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
      if (removed) this.persist()
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
    const cfg = this.store.configs.find((c) => c.id === id)
    return cfg ? { ...cfg } : null
  }
}

export const configStore = new ConfigStore()
