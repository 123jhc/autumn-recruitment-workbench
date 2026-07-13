import type { FastifyPluginCallback } from 'fastify'

export const aiStatusRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.get('/api/ai/status', async () => {
    const { baseUrl, apiKey, model } = fastify.aiConfig
    const configured = !!(baseUrl && apiKey && model)
    return {
      configured,
      model: configured ? model : undefined,
    }
  })

  done()
}
