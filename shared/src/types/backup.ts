import type { Task } from './task'
import type { TaskDraft } from './task-draft'
import type { PlanImport } from './plan-import'
import type { Application } from './application'
import type { LeetCodeProblem } from './leetcode'

export interface BackupEnvelope {
  schemaVersion: 1
  exportedAt: string
  data: {
    tasks: Task[]
    taskDrafts: TaskDraft[]
    planImports: PlanImport[]
    applications: Application[]
    leetCodeProblems: LeetCodeProblem[]
  }
}
