import { z } from 'zod'

export const PlanImportSchema = z.object({
  id: z.string(),
  sourceType: z.enum(['file', 'paste']),
  fileName: z.string().optional(),
  fileFormat: z.enum(['markdown', 'text', 'docx', 'pdf']).optional(),
  rawContent: z.string(),
  planningHorizon: z.enum(['today', 'week', 'season']),
  status: z.enum(['draft', 'confirmed', 'failed']),
  createdAt: z.string(),
  confirmedAt: z.string().optional(),
})
