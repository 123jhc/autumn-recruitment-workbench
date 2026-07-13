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
