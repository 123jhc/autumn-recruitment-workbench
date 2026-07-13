import pdfParse from 'pdf-parse'
import { FileExtractionError } from '../../utils/errors.js'

export async function extractPdf(buffer: Buffer): Promise<string> {
  try {
    const result = await pdfParse(buffer)

    if (!result.text.trim()) {
      throw new FileExtractionError(
        'PDF 中没有可提取的文字。首版不支持扫描版 PDF OCR，请使用文本版 PDF 或直接粘贴计划内容',
      )
    }

    return result.text
  } catch (err) {
    if (err instanceof FileExtractionError) {
      throw err
    }
    const msg = err instanceof Error ? err.message : '未知错误'
    if (msg.includes('password')) {
      throw new FileExtractionError('PDF 文件已加密，无法提取文字')
    }
    throw new FileExtractionError(`PDF 提取失败: ${msg}`)
  }
}
