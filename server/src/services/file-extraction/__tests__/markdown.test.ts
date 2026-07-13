import { describe, it, expect } from 'vitest'
import { extractMarkdown } from '../markdown.js'
import { FileExtractionError } from '../../../utils/errors.js'

describe('extractMarkdown', () => {
  it('should extract text from UTF-8 encoded buffer', async () => {
    const text = '# Hello World\nThis is a test.'
    const buffer = Buffer.from(text, 'utf-8')
    const result = await extractMarkdown(buffer)
    expect(result).toBe(text)
  })

  it('should extract Chinese text correctly', async () => {
    const text = '# 秋招计划\n每天完成三道算法题。'
    const buffer = Buffer.from(text, 'utf-8')
    const result = await extractMarkdown(buffer)
    expect(result).toBe(text)
  })

  it('should throw FileExtractionError for non-UTF-8 buffer', async () => {
    const buffer = Buffer.from([0x80, 0x81, 0x82])
    await expect(extractMarkdown(buffer)).rejects.toThrow(FileExtractionError)
  })
})
