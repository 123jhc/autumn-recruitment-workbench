import { z } from 'zod'

export const DifficultySchema = z.enum(['easy', 'medium', 'hard'])
export const ProblemStatusSchema = z.enum(['todo', 'solved', 'review'])

export const LeetCodeProblemSchema = z.object({
  id: z.string(),
  number: z.number().int().positive().optional(),
  title: z.string().min(1),
  url: z.string().url().optional().or(z.literal('')),
  difficulty: DifficultySchema,
  tags: z.array(z.string()),
  status: ProblemStatusSchema,
  solutionSummary: z.string().optional(),
  solvedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lastReviewedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
