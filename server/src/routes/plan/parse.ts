import type { FastifyPluginCallback } from 'fastify'
import { callAi } from '../../services/ai/client.js'
import { buildPrompt } from '../../services/ai/prompt.js'
import { validateAiOutput } from '../../services/ai/output-validator.js'
import {
  AppError,
  AiNotConfiguredError,
  AiOutputInvalidError,
  AiRequestError,
} from '../../utils/errors.js'

export const planParseRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.post('/api/plan/parse', async (request) => {
    const { aiConfig } = fastify

    if (!aiConfig.baseUrl || !aiConfig.apiKey || !aiConfig.model) {
      throw new AiNotConfiguredError()
    }

    const body = request.body as Record<string, unknown> | undefined
    const content = (body?.content as string) || ''

    if (!content.trim()) {
      throw new AppError(400, '计划内容不能为空')
    }

    if (content.length > 100_000) {
      throw new AppError(413, '文本超过 100,000 字符限制')
    }

    const planningHorizon = (body?.planningHorizon as string) || 'week'
    const today = (body?.today as string) || new Date().toISOString().slice(0, 10)
    const timezone = (body?.timezone as string) || 'Asia/Shanghai'

    const prompt = buildPrompt(content, planningHorizon, today, timezone)

    try {
      const rawOutput = await callAi(aiConfig, prompt)
      const validated = validateAiOutput(rawOutput)
      return { tasks: validated.tasks }
    } catch (err) {
      if (err instanceof AiOutputInvalidError || err instanceof AiRequestError) {
        throw err
      }
      throw new AiRequestError(err instanceof Error ? err.message : '未知错误')
    }
  })

  done()
}
