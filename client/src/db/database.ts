import Dexie, { type EntityTable } from 'dexie'
import type {
  Task, TaskDraft, PlanImport, Application, LegacyLeetCodeProblem, LeetCodeCatalogProblem,
  LeetCodeListEntry, LeetCodeProgress, LeetCodeReviewRecord, LeetCodeSchedule,
} from '@autumn-recruitment/shared'
import { normalizeLegacyLeetCodeProblems } from '../features/leetcode/legacy-normalization'

export class AppDatabase extends Dexie {
  tasks!: EntityTable<Task, 'id'>
  taskDrafts!: EntityTable<TaskDraft, 'id'>
  planImports!: EntityTable<PlanImport, 'id'>
  applications!: EntityTable<Application, 'id'>
  leetCodeProblems!: EntityTable<LegacyLeetCodeProblem, 'id'>
  leetCodeCatalog!: EntityTable<LeetCodeCatalogProblem, 'slug'>
  leetCodeListEntries!: EntityTable<LeetCodeListEntry, 'id'>
  leetCodeProgress!: EntityTable<LeetCodeProgress, 'slug'>
  leetCodeReviews!: EntityTable<LeetCodeReviewRecord, 'id'>
  leetCodeSchedules!: EntityTable<LeetCodeSchedule, 'id'>

  constructor() {
    super('AutumnRecruitmentDB')

    this.version(1).stores({
      tasks: 'id, category, status, source, sourceId, plannedDate, dueDate, createdAt',
      taskDrafts: 'id, importId',
      planImports: 'id, status, createdAt',
      applications: 'id, company, role, status, nextActionDate, createdAt',
      leetCodeProblems: 'id, number, difficulty, status, reviewDate, solvedDate, createdAt',
    })

    this.version(2).stores({
      tasks: 'id, category, status, source, sourceId, plannedDate, dueDate, createdAt',
      taskDrafts: 'id, importId',
      planImports: 'id, status, createdAt',
      applications: 'id, company, role, status, nextActionDate, createdAt',
      leetCodeProblems: 'id, number, difficulty, status, reviewDate, solvedDate, createdAt',
      leetCodeCatalog: 'slug, number, difficulty, source, updatedAt',
      leetCodeListEntries: 'id, listId, slug, topic, recommendedOrder',
      leetCodeProgress: 'slug, status, plannedDate, solvedDate, queueOrder, createdAt',
      leetCodeReviews: 'id, slug, scheduledDate, completedAt, createdAt',
      leetCodeSchedules: 'id, listId, startDate, endDate, updatedAt',
    }).upgrade(async (transaction) => {
      const legacy = await transaction.table<LegacyLeetCodeProblem>('leetCodeProblems').toArray()
      const normalized = normalizeLegacyLeetCodeProblems(legacy)

      await transaction.table('leetCodeCatalog').bulkPut(normalized.leetCodeCatalog)
      await transaction.table('leetCodeProgress').bulkPut(normalized.leetCodeProgress)
      await transaction.table('leetCodeReviews').bulkPut(normalized.leetCodeReviews)
      await transaction.table('leetCodeProblems').clear()
    })
  }
}

export const db = new AppDatabase()
