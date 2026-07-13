import mammoth from 'mammoth'
import { FileExtractionError } from '../../utils/errors.js'

export async function extractDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (err) {
    throw new FileExtractionError(
      `DOCX 提取失败: ${err instanceof Error ? err.message : '未知错误'}`,
    )
  }
}
