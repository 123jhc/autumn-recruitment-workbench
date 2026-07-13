import type { FastifyPluginCallback } from 'fastify'
import fp from 'fastify-plugin'
import { configStore } from '../services/ai/config-store.js'

export const envPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.decorate('configStore', configStore)
  done()
}

// Use fastify-plugin to break encapsulation so configStore is visible to all children
export default fp(envPlugin, {
  name: 'env-plugin',
})

declare module 'fastify' {
  interface FastifyInstance {
    configStore: typeof configStore
  }
}
