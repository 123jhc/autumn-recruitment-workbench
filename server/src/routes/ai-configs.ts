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

  fastify.post('/api/ai/configs', { schema: createSchema }, async (request, reply) => {
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
    return reply.code(201).send({ id: created.id, name: created.name, baseUrl: created.baseUrl, model: created.model })
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
