import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import 'dotenv/config'
import envPlugin from './plugins/env.js'
import { errorHandlerPlugin } from './plugins/error-handler.js'
import { planExtractRoute } from './routes/plan/extract.js'
import { planParseRoute } from './routes/plan/parse.js'
import { aiStatusRoute } from './routes/ai-status.js'
import { aiConfigsRoute } from './routes/ai-configs.js'

const PORT = parseInt(process.env.PORT || '3001', 10)

async function start() {
  const fastify = Fastify({ logger: true })

  await fastify.register(cors, { origin: true })
  await fastify.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024, // 20 MB
    },
  })
  await fastify.register(envPlugin)
  await fastify.register(errorHandlerPlugin)

  fastify.register(planExtractRoute)
  fastify.register(planParseRoute)
  fastify.register(aiStatusRoute)
  fastify.register(aiConfigsRoute)

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' })
    fastify.log.info(`Server listening on port ${PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
