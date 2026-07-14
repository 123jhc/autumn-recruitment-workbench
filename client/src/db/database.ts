import Dexie, { type EntityTable } from 'dexie'
import type {
  Task, TaskDraft, PlanImport, Application, LegacyLeetCodeProblem, LeetCodeCatalogProblem,
  LeetCodeListEntry, LeetCodeProgress, LeetCodeReviewRecord, LeetCodeSchedule,
} from '@autumn-recruitment/shared'
import { nanoid } from 'nanoid'

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
      const catalog: LeetCodeCatalogProblem[] = []
      const progress: LeetCodeProgress[] = []
      const reviews: LeetCodeReviewRecord[] = []

      legacy.forEach((problem, index) => {
        const slug = slugFromUrl(problem.url) ?? `legacy-${problem.id}`
        catalog.push({
          slug,
          number: problem.number,
          title: problem.title,
          url: problem.url ?? '',
          difficulty: problem.difficulty,
          tags: problem.tags,
          source: 'custom',
          updatedAt: problem.updatedAt,
        })
        progress.push({
          slug,
          status: problem.status === 'todo' ? 'todo' : 'solved',
          solvedDate: problem.solvedDate,
          solutionSummary: problem.solutionSummary,
          queueOrder: index + 1,
          createdAt: problem.createdAt,
          updatedAt: problem.updatedAt,
        })
        if (problem.reviewDate) {
          reviews.push({
            id: nanoid(), slug, scheduledDate: problem.reviewDate,
            createdAt: problem.createdAt, updatedAt: problem.updatedAt,
          })
        }
        if (problem.lastReviewedAt) {
          reviews.push({
            id: nanoid(), slug, scheduledDate: problem.lastReviewedAt.slice(0, 10),
            completedAt: problem.lastReviewedAt, outcome: 'mastered',
            createdAt: problem.createdAt, updatedAt: problem.updatedAt,
          })
        }
      })

      await transaction.table('leetCodeCatalog').bulkPut(catalog)
      await transaction.table('leetCodeProgress').bulkPut(progress)
      await transaction.table('leetCodeReviews').bulkPut(reviews)
      await transaction.table('leetCodeProblems').clear()
    })
  }
}

function slugFromUrl(url?: string): string | undefined {
  return url?.match(/\/problems\/([^/]+)/)?.[1]
}

export const db = new AppDatabase()
