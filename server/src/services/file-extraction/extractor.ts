import { extractMarkdown } from './markdown.js'
import { extractDocx } from './docx.js'
import { extractPdf } from './pdf.js'
import { FileExtractionError, EmptyContentError } from '../../utils/errors.js'

interface ExtractionResult {
  fileName: string
  fileFormat: 'markdown' | 'text' | 'docx' | 'pdf'
  content: string
}

export async function extractText(
  buffer: Buffer,
  fileName: string,
  ext: string,
): Promise<ExtractionResult> {
  let content: string
  let fileFormat: ExtractionResult['fileFormat']

  try {
    switch (ext) {
      case '.md':
      case '.markdown':
      case '.txt':
        content = await extractMarkdown(buffer)
        fileFormat = ext === '.txt' ? 'text' : 'markdown'
        break
      case '.docx':
        content = await extractDocx(buffer)
        fileFormat = 'docx'
        break
      case '.pdf':
        content = await extractPdf(buffer)
        fileFormat = 'pdf'
        break
      default:
        throw new FileExtractionError(`不支持的格式: ${ext}`)
    }
  } catch (err) {
    if (err instanceof FileExtractionError || err instanceof EmptyContentError) {
      throw err
    }
    throw new FileExtractionError(err instanceof Error ? err.message : '未知提取错误')
  }

  if (!content.trim()) {
    throw new EmptyContentError()
  }

  return { fileName, fileFormat, content }
}
