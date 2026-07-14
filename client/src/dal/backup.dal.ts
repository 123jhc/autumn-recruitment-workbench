import { db } from '../db/database.js'
import { nanoid } from 'nanoid'
import type { BackupEnvelope, BackupEnvelopeV2, LegacyLeetCodeProblem } from '@autumn-recruitment/shared'

const ALL_TABLES = [
  db.tasks, db.taskDrafts, db.planImports, db.applications, db.leetCodeProblems,
  db.leetCodeCatalog, db.leetCodeListEntries, db.leetCodeProgress, db.leetCodeReviews, db.leetCodeSchedules,
]

export const backupDal = {
  async exportAll(): Promise<BackupEnvelopeV2> {
    const [
      tasks, taskDrafts, planImports, applications, leetCodeCatalog, leetCodeListEntries,
      leetCodeProgress, leetCodeReviews, leetCodeSchedules,
    ] = await Promise.all([
      db.tasks.toArray(), db.taskDrafts.toArray(), db.planImports.toArray(), db.applications.toArray(),
      db.leetCodeCatalog.toArray(), db.leetCodeListEntries.toArray(), db.leetCodeProgress.toArray(),
      db.leetCodeReviews.toArray(), db.leetCodeSchedules.toArray(),
    ])

    return {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      data: {
        tasks, taskDrafts, planImports, applications, leetCodeCatalog, leetCodeListEntries,
        leetCodeProgress, leetCodeReviews, leetCodeSchedules,
      },
    }
  },

  async importBackup(envelope: BackupEnvelope): Promise<void> {
    const normalized = envelope.schemaVersion === 1 ? migrateV1(envelope.data.leetCodeProblems) : envelope.data

    await db.transaction('rw', ALL_TABLES, async () => {
      await Promise.all(ALL_TABLES.map((table) => table.clear()))
      if (envelope.data.tasks.length > 0) await db.tasks.bulkAdd(envelope.data.tasks)
      if (envelope.data.taskDrafts.length > 0) await db.taskDrafts.bulkAdd(envelope.data.taskDrafts)
      if (envelope.data.planImports.length > 0) await db.planImports.bulkAdd(envelope.data.planImports)
      if (envelope.data.applications.length > 0) await db.applications.bulkAdd(envelope.data.applications)
      if (normalized.leetCodeCatalog.length > 0) await db.leetCodeCatalog.bulkAdd(normalized.leetCodeCatalog)
      if (normalized.leetCodeListEntries.length > 0) await db.leetCodeListEntries.bulkAdd(normalized.leetCodeListEntries)
      if (normalized.leetCodeProgress.length > 0) await db.leetCodeProgress.bulkAdd(normalized.leetCodeProgress)
      if (normalized.leetCodeReviews.length > 0) await db.leetCodeReviews.bulkAdd(normalized.leetCodeReviews)
      if (normalized.leetCodeSchedules.length > 0) await db.leetCodeSchedules.bulkAdd(normalized.leetCodeSchedules)
    })
  },
}

function migrateV1(problems: LegacyLeetCodeProblem[]) {
  const leetCodeCatalog = []
  const leetCodeProgress = []
  const leetCodeReviews = []

  for (const [index, problem] of problems.entries()) {
    const slug = problem.url?.match(/\/problems\/([^/]+)/)?.[1] ?? `legacy-${problem.id}`
    leetCodeCatalog.push({
      slug, number: problem.number, title: problem.title, url: problem.url ?? '', difficulty: problem.difficulty,
      tags: problem.tags, source: 'custom' as const, updatedAt: problem.updatedAt,
    })
    leetCodeProgress.push({
      slug, status: problem.status === 'todo' ? 'todo' as const : 'solved' as const,
      solvedDate: problem.solvedDate, solutionSummary: problem.solutionSummary, queueOrder: index + 1,
      createdAt: problem.createdAt, updatedAt: problem.updatedAt,
    })
    if (problem.reviewDate) {
      leetCodeReviews.push({
        id: nanoid(), slug, scheduledDate: problem.reviewDate, createdAt: problem.createdAt, updatedAt: problem.updatedAt,
      })
    }
    if (problem.lastReviewedAt) {
      leetCodeReviews.push({
        id: nanoid(), slug, scheduledDate: problem.lastReviewedAt.slice(0, 10), completedAt: problem.lastReviewedAt,
        outcome: 'mastered' as const, createdAt: problem.createdAt, updatedAt: problem.updatedAt,
      })
    }
  }

  return { leetCodeCatalog, leetCodeListEntries: [], leetCodeProgress, leetCodeReviews, leetCodeSchedules: [] }
}
