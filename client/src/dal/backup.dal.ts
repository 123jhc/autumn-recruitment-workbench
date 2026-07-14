import { db } from '../db/database.js'
import type { BackupEnvelope, BackupEnvelopeV2 } from '@autumn-recruitment/shared'
import { normalizeLegacyLeetCodeProblems } from '../features/leetcode/legacy-normalization'

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
    const normalized = envelope.schemaVersion === 1
      ? {
          ...normalizeLegacyLeetCodeProblems(envelope.data.leetCodeProblems),
          leetCodeListEntries: [],
          leetCodeSchedules: [],
        }
      : envelope.data

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
