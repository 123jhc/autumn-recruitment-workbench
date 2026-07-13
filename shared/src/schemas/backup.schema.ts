import { z } from 'zod'
import { TaskSchema } from './task.schema'
import { TaskDraftSchema } from './task-draft.schema'
import { PlanImportSchema } from './plan-import.schema'
import { ApplicationSchema } from './application.schema'
import { LeetCodeProblemSchema } from './leetcode.schema'

export const BackupEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  data: z.object({
    tasks: z.array(TaskSchema),
    taskDrafts: z.array(TaskDraftSchema),
    planImports: z.array(PlanImportSchema),
    applications: z.array(ApplicationSchema),
    leetCodeProblems: z.array(LeetCodeProblemSchema),
  }),
})
