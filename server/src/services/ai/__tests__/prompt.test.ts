import { describe, it, expect } from 'vitest'
import { buildPrompt } from '../prompt.js'

describe('buildPrompt', () => {
  it('should include the content in the prompt', () => {
    const result = buildPrompt('我的秋招计划', 'week', '2026-07-13', 'Asia/Shanghai')
    expect(result).toContain('我的秋招计划')
  })

  it("should include today's date", () => {
    const result = buildPrompt('content', 'week', '2026-07-13', 'Asia/Shanghai')
    expect(result).toContain('2026-07-13')
  })

  it('should include category definitions', () => {
    const result = buildPrompt('content', 'week', '2026-07-13', 'Asia/Shanghai')
    expect(result).toContain('resume')
    expect(result).toContain('简历')
    expect(result).toContain('algorithm')
  })

  it('should map planningHorizon to Chinese labels', () => {
    const resultToday = buildPrompt('c', 'today', '2026-07-13', 'Asia/Shanghai')
    expect(resultToday).toContain('今天')

    const resultWeek = buildPrompt('c', 'week', '2026-07-13', 'Asia/Shanghai')
    expect(resultWeek).toContain('本周')

    const resultSeason = buildPrompt('c', 'season', '2026-07-13', 'Asia/Shanghai')
    expect(resultSeason).toContain('整个秋招阶段')
  })

  it('should include timezone', () => {
    const result = buildPrompt('c', 'week', '2026-07-13', 'Asia/Shanghai')
    expect(result).toContain('Asia/Shanghai')
  })
})
