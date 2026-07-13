import { describe, it, expect } from 'vitest'
import { extractPdf } from '../pdf.js'
import { FileExtractionError } from '../../../utils/errors.js'

describe('extractPdf', () => {
  it('should throw FileExtractionError for empty/invalid PDF buffer', async () => {
    const buffer = Buffer.from('not a pdf')
    await expect(extractPdf(buffer)).rejects.toThrow(FileExtractionError)
  })

  it('should throw FileExtractionError with extraction failure message', async () => {
    const buffer = Buffer.from('random bytes 12345')
    try {
      await extractPdf(buffer)
      expect.unreachable('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(FileExtractionError)
      expect((err as FileExtractionError).statusCode).toBe(422)
    }
  })
})
