import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import envPlugin from '../../plugins/env.js'
import { errorHandlerPlugin } from '../../plugins/error-handler.js'
import { planParseRoute } from '../plan/parse.js'

async function buildTestServer() {
  const fastify = Fastify()
  await fastify.register(cors, { origin: true })
  await fastify.register(multipart)
  await fastify.register(envPlugin)
  await fastify.register(errorHandlerPlugin)
  fastify.register(planParseRoute)
  return fastify
}

describe('POST /api/plan/parse', () => {
  let fastify: Awaited<ReturnType<typeof buildTestServer>>

  beforeEach(async () => {
    fastify = await buildTestServer()
  })

  afterEach(async () => {
    await fastify.close()
  })

  it('should reject when AI is not configured (503)', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/plan/parse',
      payload: {
        content: '我的秋招计划',
        planningHorizon: 'week',
      },
    })

    expect(response.statusCode).toBe(503)
    const body = JSON.parse(response.body)
    expect(body.error).toContain('AI 服务未配置')
  })

  it('should reject empty content (400)', async () => {
    process.env.AI_BASE_URL = 'https://api.test.com/v1'
    process.env.AI_API_KEY = 'test-key'
    process.env.AI_MODEL = 'test-model'

    const server = await buildTestServer()

    try {
      const response = await server.inject({
        method: 'POST',
        url: '/api/plan/parse',
        payload: {
          content: '',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toContain('不能为空')
    } finally {
      delete process.env.AI_BASE_URL
      delete process.env.AI_API_KEY
      delete process.env.AI_MODEL
      await server.close()
    }
  })

  it('should reject whitespace-only content (400)', async () => {
    process.env.AI_BASE_URL = 'https://api.test.com/v1'
    process.env.AI_API_KEY = 'test-key'
    process.env.AI_MODEL = 'test-model'

    const server = await buildTestServer()

    try {
      const response = await server.inject({
        method: 'POST',
        url: '/api/plan/parse',
        payload: {
          content: '   ',
        },
      })

      expect(response.statusCode).toBe(400)
    } finally {
      delete process.env.AI_BASE_URL
      delete process.env.AI_API_KEY
      delete process.env.AI_MODEL
      await server.close()
    }
  })

  it('should reject content exceeding 100K chars (413)', async () => {
    process.env.AI_BASE_URL = 'https://api.test.com/v1'
    process.env.AI_API_KEY = 'test-key'
    process.env.AI_MODEL = 'test-model'

    const server = await buildTestServer()

    try {
      const response = await server.inject({
        method: 'POST',
        url: '/api/plan/parse',
        payload: {
          content: 'a'.repeat(100_001),
        },
      })

      expect(response.statusCode).toBe(413)
      const body = JSON.parse(response.body)
      expect(body.error).toContain('100,000')
    } finally {
      delete process.env.AI_BASE_URL
      delete process.env.AI_API_KEY
      delete process.env.AI_MODEL
      await server.close()
    }
  })
})
