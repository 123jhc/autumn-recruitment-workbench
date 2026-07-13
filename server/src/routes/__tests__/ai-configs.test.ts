import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import Fastify from 'fastify'
import cors from '@fastify/cors'

let tmpDir: string

async function buildServer() {
  vi.resetModules()
  const envMod = await import('../../plugins/env.js')
  const ehMod = await import('../../plugins/error-handler.js')
  const routeMod = await import('../ai-configs.js')
  const fastify = Fastify()
  await fastify.register(cors, { origin: true })
  await fastify.register(envMod.envPlugin)
  await fastify.register(ehMod.errorHandlerPlugin)
  fastify.register(routeMod.aiConfigsRoute)
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

  it('PUT /:id returns 404 for unknown id', async () => {
    const res = await fastify.inject({
      method: 'PUT',
      url: '/api/ai/configs/no-such',
      payload: { name: 'A', baseUrl: 'https://a/v1', model: 'm' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('DELETE /:id returns 404 for unknown id', async () => {
    const res = await fastify.inject({ method: 'DELETE', url: '/api/ai/configs/no-such' })
    expect(res.statusCode).toBe(404)
  })

  it('PUT /:id/active returns 404 for unknown id', async () => {
    const res = await fastify.inject({ method: 'PUT', url: '/api/ai/configs/no-such/active' })
    expect(res.statusCode).toBe(404)
  })

  it('POST rejects invalid baseUrl without http(s)://', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/ai/configs',
      payload: { name: 'A', baseUrl: 'ftp://x', apiKey: 'sk', model: 'm' },
    })
    expect(res.statusCode).toBe(400)
  })
})
