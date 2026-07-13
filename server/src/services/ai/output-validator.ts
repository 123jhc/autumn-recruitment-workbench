import { AiOutputSchema } from '@autumn-recruitment/shared'
import { AiOutputInvalidError } from '../../utils/errors.js'

export function validateAiOutput(rawOutput: string): { tasks: unknown[] } {
  let parsed: unknown
  try {
    // Try to extract JSON from the output (AI might wrap it in markdown code blocks)
    const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawOutput.trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new AiOutputInvalidError('AI 返回内容不是有效的 JSON')
  }

  const result = AiOutputSchema.safeParse(parsed)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    throw new AiOutputInvalidError(issues)
  }

  return result.data
}
