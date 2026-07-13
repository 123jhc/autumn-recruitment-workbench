import { describe, it, expect } from 'vitest'
import { extractText } from '../extractor.js'
import { EmptyContentError } from '../../../utils/errors.js'

describe('extractText', () => {
  it('should extract markdown text for .md files', async () => {
    const buffer = Buffer.from('# Plan\nDo something.', 'utf-8')
    const result = await extractText(buffer, 'plan.md', '.md')
    expect(result.fileName).toBe('plan.md')
    expect(result.fileFormat).toBe('markdown')
    expect(result.content).toBe('# Plan\nDo something.')
  })

  it('should extract text for .txt files', async () => {
    const buffer = Buffer.from('Plain text content', 'utf-8')
    const result = await extractText(buffer, 'notes.txt', '.txt')
    expect(result.fileFormat).toBe('text')
    expect(result.content).toBe('Plain text content')
  })

  it('should throw EmptyContentError for files with only whitespace', async () => {
    const buffer = Buffer.from('   \n  \t  ', 'utf-8')
    await expect(extractText(buffer, 'empty.md', '.md')).rejects.toThrow(EmptyContentError)
  })

  it('should throw for unsupported extensions', async () => {
    const buffer = Buffer.from('test', 'utf-8')
    await expect(extractText(buffer, 'file.csv', '.csv')).rejects.toThrow()
  })
})
