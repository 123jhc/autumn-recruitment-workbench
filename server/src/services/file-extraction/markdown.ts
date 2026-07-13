import { FileExtractionError } from '../../utils/errors.js'

export async function extractMarkdown(buffer: Buffer): Promise<string> {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    throw new FileExtractionError('无法按 UTF-8 解码文本文件，请确认文件编码')
  }
}
