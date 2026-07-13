import { describe, it, expect, afterAll } from 'vitest'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import envPlugin from '../../plugins/env.js'
import { errorHandlerPlugin } from '../../plugins/error-handler.js'
import { planExtractRoute } from '../plan/extract.js'

async function buildTestServer() {
  const fastify = Fastify()
  await fastify.register(cors, { origin: true })
  await fastify.register(multipart)
  await fastify.register(envPlugin)
  await fastify.register(errorHandlerPlugin)
  fastify.register(planExtractRoute)
  return fastify
}

function createMultipartBody(
  fileName: string,
  fileContent: string = 'test content',
): { body: Buffer; contentType: string } {
  const boundary = '----TestBoundary123'
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
    'Content-Type: text/plain',
    '',
    fileContent,
    `--${boundary}--`,
    '',
  ].join('\r\n')

  return {
    body: Buffer.from(body),
    contentType: `multipart/form-data; boundary=${boundary}`,
  }
}

describe('POST /api/plan/extract', () => {
  it('should reject request without file (400)', async () => {
    const fastify = await buildTestServer()
    try {
      // Send request with non-multipart content type
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/plan/extract',
        payload: 'not multipart',
        headers: {
          'content-type': 'application/json',
        },
      })
      expect(response.statusCode).toBe(400)
    } finally {
      await fastify.close()
    }
  })

  it('should reject unsupported file format (415)', async () => {
    const fastify = await buildTestServer()
    try {
      const { body, contentType } = createMultipartBody('data.csv')

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/plan/extract',
        body,
        headers: {
          'content-type': contentType,
        },
      })
      expect(response.statusCode).toBe(415)
      const resBody = JSON.parse(response.body)
      expect(resBody.error).toContain('不支持')
    } finally {
      await fastify.close()
    }
  })

  it('should reject .doc format with specific message (415)', async () => {
    const fastify = await buildTestServer()
    try {
      const { body, contentType } = createMultipartBody('legacy.doc')

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/plan/extract',
        body,
        headers: {
          'content-type': contentType,
        },
      })
      expect(response.statusCode).toBe(415)
      const resBody = JSON.parse(response.body)
      expect(resBody.error).toContain('.doc')
      expect(resBody.error).toContain('.docx')
    } finally {
      await fastify.close()
    }
  })
})
