import type { FastifyInstance } from 'fastify'

interface AiConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export async function callAi(config: AiConfig, prompt: string): Promise<string> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: '请根据上述要求拆解任务。' },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`AI 服务返回 ${response.status}`)
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('AI 返回内容为空')
    }

    return content
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('AI 请求超时（60秒）')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

export interface AiProbeResult {
  ok: boolean
  message?: string
}

export async function callAiProbe(config: AiConfig, timeoutMs = 15_000): Promise<AiProbeResult> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'ok' }],
        max_tokens: 1,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { ok: false, message: '鉴权失败，请检查 API Key' }
      }
      if (response.status === 404) {
        return { ok: false, message: '接口路径不存在，请检查 Base URL' }
      }
      return { ok: false, message: `服务返回 ${response.status}` }
    }

    const data = (await response.json()) as { choices?: unknown }
    if (!data.choices) {
      return { ok: false, message: '响应缺少 choices 字段' }
    }
    return { ok: true }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return { ok: false, message: `连接超时(${Math.round(timeoutMs / 1000)}秒)` }
    }
    return { ok: false, message: '网络请求失败' }
  } finally {
    clearTimeout(timeout)
  }
}
