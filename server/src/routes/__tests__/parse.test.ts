import { describe, it, expect, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'

let tmpDir: string

async function buildTestServer(seed?: { baseUrl: string; apiKey: string; model: string }) {
  vi.resetModules()
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
  const envMod = await import('../../plugins/env.js')
  const ehMod = await import('../../plugins/error-handler.js')
  const parseMod = await import('../plan/parse.js')
  const fastify = Fastify()
  await fastify.register(cors, { origin: true })
  await fastify.register(multipart)
  await fastify.register(envMod.envPlugin)
  await fastify.register(ehMod.errorHandlerPlugin)
  fastify.register(parseMod.planParseRoute)
  return fastify
}

function cleanup() {
  rmSync(tmpDir, { recursive: true, force: true })
  delete process.env.AI_CONFIGS_PATH
}

describe('POST /api/plan/parse', () => {
  it('should reject when AI is not configured (503)', async () => {
    const server = await buildTestServer()
    try {
      const response = await server.inject({
        method: 'POST',
        url: '/api/plan/parse',
        payload: { content: '我的秋招计划', planningHorizon: 'week' },
      })
      expect(response.statusCode).toBe(503)
      const body = JSON.parse(response.body)
      expect(body.error).toContain('AI 服务未配置')
    } finally {
      await server.close()
      cleanup()
    }
  })

  it('should reject empty content (400)', async () => {
    const server = await buildTestServer({
      baseUrl: 'https://api.test.com/v1',
      apiKey: 'test-key',
      model: 'test-model',
    })
    try {
      const response = await server.inject({
        method: 'POST',
        url: '/api/plan/parse',
        payload: { content: '' },
      })
      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toContain('不能为空')
    } finally {
      await server.close()
      cleanup()
    }
  })

  it('should reject whitespace-only content (400)', async () => {
    const server = await buildTestServer({
      baseUrl: 'https://api.test.com/v1',
      apiKey: 'test-key',
      model: 'test-model',
    })
    try {
      const response = await server.inject({
        method: 'POST',
        url: '/api/plan/parse',
        payload: { content: '   ' },
      })
      expect(response.statusCode).toBe(400)
    } finally {
      await server.close()
      cleanup()
    }
  })

  it('should reject content exceeding 100K chars (413)', async () => {
    const server = await buildTestServer({
      baseUrl: 'https://api.test.com/v1',
      apiKey: 'test-key',
      model: 'test-model',
    })
    try {
      const response = await server.inject({
        method: 'POST',
        url: '/api/plan/parse',
        payload: { content: 'a'.repeat(100_001) },
      })
      expect(response.statusCode).toBe(413)
      const body = JSON.parse(response.body)
      expect(body.error).toContain('100,000')
    } finally {
      await server.close()
      cleanup()
    }
  })
})
