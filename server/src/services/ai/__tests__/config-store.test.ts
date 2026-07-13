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

  it('seeds from .env when json exists but configs empty', async () => {
    process.env.AI_BASE_URL = 'https://api.deepseek.com/v1'
    process.env.AI_API_KEY = 'sk-seed'
    process.env.AI_MODEL = 'deepseek-v4-flash'
    writeFileSync(storePath, JSON.stringify({ configs: [], activeId: null }))

    const store = await importStore()
    const snapshot = store.snapshot()
    expect(snapshot.configs).toHaveLength(1)
    expect(snapshot.configs[0].name).toBe('默认')
    expect(snapshot.activeId).toBe(snapshot.configs[0].id)
  })

  it('does not persist available to disk', async () => {
    const store = await importStore()
    const created = await store.create({
      name: 'A', baseUrl: 'https://a/v1', apiKey: 'sk', model: 'm',
    })
    store.setAvailability(created.id, true)

    const onDisk = JSON.parse(readFileSync(storePath, 'utf-8'))
    expect(onDisk.configs[0].available).toBeUndefined()
    expect(store.snapshot().configs[0].available).toBe(true)
  })

  it('serializes concurrent updates to the same id', async () => {
    const store = await importStore()
    const created = await store.create({
      name: 'A', baseUrl: 'https://a/v1', apiKey: 'sk', model: 'm',
    })
    await Promise.all([
      store.update(created.id, { name: 'X', baseUrl: 'https://a/v1', model: 'm' }),
      store.update(created.id, { name: 'Y', baseUrl: 'https://a/v1', model: 'm' }),
    ])
    const finalName = store.snapshot().configs[0].name
    expect(['X', 'Y']).toContain(finalName)
  })

  it('update of non-existent id returns null', async () => {
    const store = await importStore()
    const result = await store.update('no-such', { name: 'A', baseUrl: 'https://a/v1', model: 'm' })
    expect(result).toBeNull()
  })

  it('setActive of non-existent id returns false', async () => {
    const store = await importStore()
    const ok = await store.setActive('no-such')
    expect(ok).toBe(false)
  })

  it('remove of non-existent id returns false', async () => {
    const store = await importStore()
    const removed = await store.remove('no-such')
    expect(removed).toBe(false)
  })
})
