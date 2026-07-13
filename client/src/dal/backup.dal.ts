import { db } from '../db/database.js'
import type { BackupEnvelope } from '@autumn-recruitment/shared'

export const backupDal = {
  async exportAll(): Promise<BackupEnvelope> {
    const [tasks, taskDrafts, planImports, applications, leetCodeProblems] = await Promise.all([
      db.tasks.toArray(),
      db.taskDrafts.toArray(),
      db.planImports.toArray(),
      db.applications.toArray(),
      db.leetCodeProblems.toArray(),
    ])

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        tasks,
        taskDrafts,
        planImports,
        applications,
        leetCodeProblems,
      },
    }
  },

  async importBackup(envelope: BackupEnvelope): Promise<void> {
    await db.transaction('rw', [db.tasks, db.taskDrafts, db.planImports, db.applications, db.leetCodeProblems], async () => {
      await db.tasks.clear()
      await db.taskDrafts.clear()
      await db.planImports.clear()
      await db.applications.clear()
      await db.leetCodeProblems.clear()

      if (envelope.data.tasks.length > 0) {
        await db.tasks.bulkAdd(envelope.data.tasks)
      }
      if (envelope.data.taskDrafts.length > 0) {
        await db.taskDrafts.bulkAdd(envelope.data.taskDrafts)
      }
      if (envelope.data.planImports.length > 0) {
        await db.planImports.bulkAdd(envelope.data.planImports)
      }
      if (envelope.data.applications.length > 0) {
        await db.applications.bulkAdd(envelope.data.applications)
      }
      if (envelope.data.leetCodeProblems.length > 0) {
        await db.leetCodeProblems.bulkAdd(envelope.data.leetCodeProblems)
      }
    })
  },
}
