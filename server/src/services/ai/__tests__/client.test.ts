import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callAi } from '../client.js'

const config = {
  baseUrl: 'https://api.test.com/v1',
  apiKey: 'test-key',
  model: 'test-model',
}

describe('callAi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should return content from AI response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: '{"tasks":[]}' } }],
          }),
      }),
    )

    const result = await callAi(config, 'test prompt')
    expect(result).toBe('{"tasks":[]}')
    expect(fetch).toHaveBeenCalledWith(
      'https://api.test.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('should throw on non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    )

    await expect(callAi(config, 'test')).rejects.toThrow('AI 服务返回 500')
  })

  it('should throw on empty content in response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: '' } }] }),
      }),
    )

    await expect(callAi(config, 'test')).rejects.toThrow('AI 返回内容为空')
  })

  it('should throw on request timeout', async () => {
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(abortError),
    )

    await expect(callAi(config, 'test')).rejects.toThrow('AI 请求超时')
  })
})
