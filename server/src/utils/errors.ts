export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public detail?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class FileTooLargeError extends AppError {
  constructor() {
    super(413, '文件大小超过 20 MB 限制')
  }
}

export class UnsupportedFormatError extends AppError {
  constructor(format?: string) {
    super(
      415,
      format === 'doc'
        ? '不支持旧版 .doc 格式，请另存为 .docx 后重新上传'
        : `不支持的文件格式${format ? `: ${format}` : ''}，请上传 .md、.txt、.docx 或 .pdf 文件`,
    )
  }
}

export class TextTooLongError extends AppError {
  constructor(maxLength: number) {
    super(413, `提取文本超过 ${maxLength.toLocaleString()} 字符限制`)
  }
}

export class EmptyContentError extends AppError {
  constructor() {
    super(400, '文件内容为空')
  }
}

export class FileExtractionError extends AppError {
  constructor(reason: string) {
    super(422, `文件提取失败: ${reason}`)
  }
}

export class AiNotConfiguredError extends AppError {
  constructor() {
    super(503, 'AI 服务未配置。请在 .env 文件中设置 AI_BASE_URL、AI_API_KEY 和 AI_MODEL')
  }
}

export class AiOutputInvalidError extends AppError {
  constructor(detail: string) {
    super(422, 'AI 输出格式校验失败', detail)
  }
}

export class AiRequestError extends AppError {
  constructor(message: string) {
    super(502, `AI 请求失败: ${message}`)
  }
}
