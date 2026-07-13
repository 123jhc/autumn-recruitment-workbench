import type { FastifyPluginCallback } from 'fastify'
import fp from 'fastify-plugin'

export const envPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.decorate('aiConfig', {
    baseUrl: process.env.AI_BASE_URL || '',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || '',
  })
  done()
}

// Use fastify-plugin to break encapsulation so aiConfig is visible to all children
export default fp(envPlugin, {
  name: 'env-plugin',
})

declare module 'fastify' {
  interface FastifyInstance {
    aiConfig: {
      baseUrl: string
      apiKey: string
      model: string
    }
  }
}
