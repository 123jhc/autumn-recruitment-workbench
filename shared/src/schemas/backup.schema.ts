import { z } from 'zod'
import { TaskSchema } from './task.schema'
import { TaskDraftSchema } from './task-draft.schema'
import { PlanImportSchema } from './plan-import.schema'
import { ApplicationSchema } from './application.schema'
import {
  LegacyLeetCodeProblemSchema, LeetCodeCatalogProblemSchema, LeetCodeListEntrySchema,
  LeetCodeProgressSchema, LeetCodeReviewRecordSchema, LeetCodeScheduleSchema,
} from './leetcode.schema'

const common = {
  tasks: z.array(TaskSchema),
  taskDrafts: z.array(TaskDraftSchema),
  planImports: z.array(PlanImportSchema),
  applications: z.array(ApplicationSchema),
}

const BackupEnvelopeV1Schema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  data: z.object({ ...common, leetCodeProblems: z.array(LegacyLeetCodeProblemSchema) }),
})

const BackupEnvelopeV2Schema = z.object({
  schemaVersion: z.literal(2),
  exportedAt: z.string(),
  data: z.object({
    ...common,
    leetCodeCatalog: z.array(LeetCodeCatalogProblemSchema),
    leetCodeListEntries: z.array(LeetCodeListEntrySchema),
    leetCodeProgress: z.array(LeetCodeProgressSchema),
    leetCodeReviews: z.array(LeetCodeReviewRecordSchema),
    leetCodeSchedules: z.array(LeetCodeScheduleSchema),
  }),
})

export const BackupEnvelopeSchema = z.discriminatedUnion('schemaVersion', [BackupEnvelopeV1Schema, BackupEnvelopeV2Schema])
