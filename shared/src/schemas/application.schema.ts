import { z } from 'zod'

export const ApplicationStatusSchema = z.enum(['target', 'preparing', 'applied', 'assessment', 'interview', 'offer', 'rejected'])

export const ApplicationSchema = z.object({
  id: z.string(),
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  requirements: z.string().optional(),
  status: ApplicationStatusSchema,
  appliedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
