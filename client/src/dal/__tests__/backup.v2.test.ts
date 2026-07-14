import { beforeEach, describe, expect, it } from 'vitest'
import { BackupEnvelopeSchema } from '@autumn-recruitment/shared'
import { db } from '../../db/database'
import { backupDal } from '../backup.dal'

describe('backup schema v2', () => {
  beforeEach(async () => {
    await Promise.all([
      db.tasks.clear(), db.taskDrafts.clear(), db.planImports.clear(), db.applications.clear(),
      db.leetCodeCatalog.clear(), db.leetCodeListEntries.clear(), db.leetCodeProgress.clear(),
      db.leetCodeReviews.clear(), db.leetCodeSchedules.clear(),
    ])
  })

  it('exports normalized LeetCode data as schema version 2', async () => {
    const now = new Date().toISOString()
    await db.leetCodeCatalog.add({
      slug: 'two-sum', number: 1, title: '两数之和', url: '', difficulty: 'easy', tags: ['哈希'], source: 'builtin', updatedAt: now,
    })
    await db.leetCodeProgress.add({ slug: 'two-sum', status: 'todo', queueOrder: 1, createdAt: now, updatedAt: now })

    const envelope = await backupDal.exportAll()

    expect(envelope.schemaVersion).toBe(2)
    expect(envelope.data.leetCodeCatalog).toHaveLength(1)
    expect(BackupEnvelopeSchema.safeParse(envelope).success).toBe(true)
  })

  it('accepts a v1 backup and migrates its LeetCode records', async () => {
    const now = new Date().toISOString()
    const v1 = {
      schemaVersion: 1 as const,
      exportedAt: now,
      data: {
        tasks: [], taskDrafts: [], planImports: [], applications: [],
        leetCodeProblems: [{
          id: 'old-1', number: 1, title: '两数之和', url: 'https://leetcode.cn/problems/two-sum/',
          difficulty: 'easy' as const, tags: ['哈希'], status: 'review' as const,
          solutionSummary: '摘要', solvedDate: '2026-07-01', reviewDate: '2026-07-20',
          createdAt: now, updatedAt: now,
        }],
      },
    }

    expect(BackupEnvelopeSchema.safeParse(v1).success).toBe(true)
    await backupDal.importBackup(v1)

    expect(await db.leetCodeCatalog.get('two-sum')).toMatchObject({ number: 1, title: '两数之和' })
    expect(await db.leetCodeProgress.get('two-sum')).toMatchObject({ status: 'solved', solutionSummary: '摘要' })
    expect(await db.leetCodeReviews.where('slug').equals('two-sum').first()).toMatchObject({ scheduledDate: '2026-07-20' })
  })
})
