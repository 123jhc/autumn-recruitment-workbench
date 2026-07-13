import { z } from 'zod'

export const TaskStatusSchema = z.enum(['todo', 'done'])
export const TaskPrioritySchema = z.enum(['high', 'medium', 'low'])
export const TaskCategorySchema = z.enum(['resume', 'project', 'algorithm', 'knowledge', 'application', 'interview', 'other'])
export const TaskSourceSchema = z.enum(['manual', 'plan', 'application'])

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  category: TaskCategorySchema,
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: TaskPrioritySchema,
  estimatedMinutes: z.number().int().positive().optional(),
  status: TaskStatusSchema,
  notes: z.string().optional(),
  source: TaskSourceSchema,
  sourceId: z.string().optional(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  updatedAt: z.string(),
})
