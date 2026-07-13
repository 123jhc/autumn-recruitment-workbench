import { describe, it, expect } from 'vitest'
import { validateAiOutput } from '../output-validator.js'
import { AiOutputInvalidError } from '../../../utils/errors.js'

const validOutput = JSON.stringify({
  tasks: [
    {
      title: '完善项目经历描述',
      category: 'resume',
      plannedDate: '2026-07-14',
      dueDate: '2026-07-16',
      priority: 'high',
      estimatedMinutes: 90,
      rationale: '该任务是本周投递前置条件',
    },
  ],
})

describe('validateAiOutput', () => {
  it('should validate a correct AI output JSON', () => {
    const result = validateAiOutput(validOutput)
    expect(result.tasks).toHaveLength(1)
  })

  it('should extract JSON from markdown code blocks', () => {
    const wrapped = '```json\n' + validOutput + '\n```'
    const result = validateAiOutput(wrapped)
    expect(result.tasks).toHaveLength(1)
  })

  it('should throw AiOutputInvalidError for non-JSON string', () => {
    expect(() => validateAiOutput('this is not json')).toThrow(AiOutputInvalidError)
  })

  it('should reject unknown category enum values', () => {
    const bad = JSON.stringify({
      tasks: [{ title: 'Test', category: 'unknown', priority: 'high' }],
    })
    expect(() => validateAiOutput(bad)).toThrow(AiOutputInvalidError)
  })

  it('should reject unknown priority enum values', () => {
    const bad = JSON.stringify({
      tasks: [{ title: 'Test', category: 'resume', priority: 'urgent' }],
    })
    expect(() => validateAiOutput(bad)).toThrow(AiOutputInvalidError)
  })

  it('should reject empty task title', () => {
    const bad = JSON.stringify({
      tasks: [{ title: '', category: 'resume', priority: 'high' }],
    })
    expect(() => validateAiOutput(bad)).toThrow(AiOutputInvalidError)
  })

  it('should reject invalid date format', () => {
    const bad = JSON.stringify({
      tasks: [
        { title: 'Test', category: 'resume', priority: 'high', plannedDate: 'July 14' },
      ],
    })
    expect(() => validateAiOutput(bad)).toThrow(AiOutputInvalidError)
  })

  it('should reject negative estimatedMinutes', () => {
    const bad = JSON.stringify({
      tasks: [
        { title: 'Test', category: 'resume', priority: 'high', estimatedMinutes: -10 },
      ],
    })
    expect(() => validateAiOutput(bad)).toThrow(AiOutputInvalidError)
  })

  it('should reject missing tasks array', () => {
    const bad = JSON.stringify({ items: [] })
    expect(() => validateAiOutput(bad)).toThrow(AiOutputInvalidError)
  })

  it('should allow optional fields to be absent', () => {
    const minimal = JSON.stringify({
      tasks: [{ title: 'Minimal task', category: 'other', priority: 'low' }],
    })
    const result = validateAiOutput(minimal)
    expect(result.tasks).toHaveLength(1)
  })

  it('should allow tasks array to be empty', () => {
    const empty = JSON.stringify({ tasks: [] })
    const result = validateAiOutput(empty)
    expect(result.tasks).toHaveLength(0)
  })
})
