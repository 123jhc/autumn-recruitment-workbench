import { z } from 'zod'
import { TaskCategorySchema, TaskPrioritySchema } from './task.schema'

export const TaskDraftSchema = z.object({
  id: z.string(),
  importId: z.string(),
  title: z.string().min(1),
  category: TaskCategorySchema,
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: TaskPrioritySchema,
  estimatedMinutes: z.number().int().positive().optional(),
  rationale: z.string().optional(),
})
