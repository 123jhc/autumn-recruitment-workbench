import type { FastifyPluginCallback, FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'

const errorHandlerFn: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.setErrorHandler(
    (error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
      const statusCode = (error as any).statusCode
      if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 600) {
        reply.code(statusCode).send({
          error: error.message,
          detail: (error as any).detail,
        })
        return
      }

      // Fastify validation errors
      if (error.statusCode === 400 && error.validation) {
        reply.code(400).send({ error: error.message })
        return
      }

      fastify.log.error(error)
      reply.code(error.statusCode || 500).send({
        error: '服务器内部错误',
      })
    },
  )
  done()
}

export const errorHandlerPlugin = fp(errorHandlerFn, {
  name: 'error-handler-plugin',
})
