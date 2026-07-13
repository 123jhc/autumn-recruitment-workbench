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
