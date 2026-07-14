import type { Task } from './task'
import type { TaskDraft } from './task-draft'
import type { PlanImport } from './plan-import'
import type { Application } from './application'
import type {
  LegacyLeetCodeProblem, LeetCodeCatalogProblem, LeetCodeListEntry, LeetCodeProgress,
  LeetCodeReviewRecord, LeetCodeSchedule,
} from './leetcode'

interface CommonBackupData {
  tasks: Task[]
  taskDrafts: TaskDraft[]
  planImports: PlanImport[]
  applications: Application[]
}

export interface BackupEnvelopeV1 {
  schemaVersion: 1
  exportedAt: string
  data: CommonBackupData & { leetCodeProblems: LegacyLeetCodeProblem[] }
}

export interface BackupEnvelopeV2 {
  schemaVersion: 2
  exportedAt: string
  data: CommonBackupData & {
    leetCodeCatalog: LeetCodeCatalogProblem[]
    leetCodeListEntries: LeetCodeListEntry[]
    leetCodeProgress: LeetCodeProgress[]
    leetCodeReviews: LeetCodeReviewRecord[]
    leetCodeSchedules: LeetCodeSchedule[]
  }
}

export type BackupEnvelope = BackupEnvelopeV1 | BackupEnvelopeV2
