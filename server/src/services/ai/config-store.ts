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
