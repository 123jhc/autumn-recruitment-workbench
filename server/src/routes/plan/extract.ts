import type { FastifyPluginCallback } from 'fastify'
import { ALLOWED_FILE_EXTENSIONS, MAX_TEXT_LENGTH } from '@autumn-recruitment/shared'
import { extractText } from '../../services/file-extraction/extractor.js'
import { AppError, UnsupportedFormatError } from '../../utils/errors.js'

export const planExtractRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.post('/api/plan/extract', async (request) => {
    const data = await request.file()

    if (!data) {
      throw new AppError(400, '请上传文件')
    }

    const fileName = data.filename
    const ext = getExtension(fileName)

    if (!ALLOWED_FILE_EXTENSIONS.includes(ext as any)) {
      throw new UnsupportedFormatError(ext)
    }

    const buffer = await data.toBuffer()
    const result = await extractText(buffer, fileName, ext)

    if (result.content.length > MAX_TEXT_LENGTH) {
      throw new AppError(413, `提取文本超过 ${MAX_TEXT_LENGTH.toLocaleString()} 字符限制`)
    }

    return result
  })

  done()
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.')
  return idx === -1 ? '' : filename.slice(idx).toLowerCase()
}
