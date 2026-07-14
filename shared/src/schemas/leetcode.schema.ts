import { z } from 'zod'

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const DifficultySchema = z.enum(['easy', 'medium', 'hard'])
export const ProblemStatusSchema = z.enum(['todo', 'solved', 'review'])
export const ProgressStatusSchema = z.enum(['todo', 'solved'])

export const LegacyLeetCodeProblemSchema = z.object({
  id: z.string(),
  number: z.number().int().positive().optional(),
  title: z.string().min(1),
  url: z.string().url().optional().or(z.literal('')),
  difficulty: DifficultySchema,
  tags: z.array(z.string()),
  status: ProblemStatusSchema,
  solutionSummary: z.string().optional(),
  solvedDate: DateSchema.optional(),
  reviewDate: DateSchema.optional(),
  lastReviewedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const LeetCodeCatalogProblemSchema = z.object({
  slug: z.string().min(1), number: z.number().int().positive().optional(), title: z.string().min(1),
  url: z.string(), difficulty: DifficultySchema, tags: z.array(z.string()), source: z.enum(['builtin', 'custom']), updatedAt: z.string(),
})
export const LeetCodeListEntrySchema = z.object({
  id: z.string(), listId: z.string(), slug: z.string(), topic: z.string(), recommendedOrder: z.number().int().positive(),
})
export const LeetCodeProgressSchema = z.object({
  slug: z.string(), status: ProgressStatusSchema, plannedDate: DateSchema.optional(), solvedDate: DateSchema.optional(),
  solutionSummary: z.string().optional(), queueOrder: z.number().int().nonnegative(), createdAt: z.string(), updatedAt: z.string(),
})
export const LeetCodeReviewRecordSchema = z.object({
  id: z.string(), slug: z.string(), scheduledDate: DateSchema, completedAt: z.string().optional(),
  outcome: z.enum(['mastered', 'repeat']).optional(), createdAt: z.string(), updatedAt: z.string(),
})
export const LeetCodeScheduleSchema = z.object({
  id: z.string(), listId: z.string(), startDate: DateSchema, endDate: DateSchema,
  weekdays: z.array(z.number().int().min(1).max(7)).min(1), createdAt: z.string(), updatedAt: z.string(),
})

// Compatibility alias for version-1 imports.
export const LeetCodeProblemSchema = LegacyLeetCodeProblemSchema
