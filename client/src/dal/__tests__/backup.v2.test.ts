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

  it('merges duplicate v1 URLs without losing progress or review records', async () => {
    const v1 = {
      schemaVersion: 1 as const,
      exportedAt: '2026-07-31T00:00:00.000Z',
      data: {
        tasks: [], taskDrafts: [], planImports: [], applications: [],
        leetCodeProblems: [
          {
            id: 'todo-newest', number: 999, title: '待办版本', url: 'https://leetcode.cn/problems/two-sum/',
            difficulty: 'hard' as const, tags: ['待办'], status: 'todo' as const,
            reviewDate: '2026-08-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-30T00:00:00.000Z',
          },
          {
            id: 'other', number: 2, title: '两数相加', url: 'https://leetcode.cn/problems/add-two-numbers/',
            difficulty: 'medium' as const, tags: ['链表'], status: 'todo' as const,
            createdAt: '2026-07-02T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z',
          },
          {
            id: 'solved-newer', number: 1, title: '已完成版本', url: 'https://leetcode.cn/problems/two-sum/',
            difficulty: 'easy' as const, tags: ['数组'], status: 'solved' as const,
            solvedDate: '2026-07-02', solutionSummary: '哈希一次遍历',
            lastReviewedAt: '2026-07-21T08:00:00.000Z',
            createdAt: '2026-07-03T00:00:00.000Z', updatedAt: '2026-07-20T00:00:00.000Z',
          },
          {
            id: 'review-older', number: 1, title: '复习版本', url: 'https://leetcode.cn/problems/two-sum/',
            difficulty: 'medium' as const, tags: ['哈希'], status: 'review' as const,
            solvedDate: '2026-07-03', reviewDate: '2026-08-03',
            lastReviewedAt: '2026-07-22T08:00:00.000Z',
            createdAt: '2026-07-04T00:00:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z',
          },
        ],
      },
    }

    await backupDal.importBackup(v1)

    expect(await db.leetCodeCatalog.toArray()).toHaveLength(2)
    expect(await db.leetCodeCatalog.get('two-sum')).toMatchObject({
      number: 1, title: '复习版本', difficulty: 'medium', tags: ['哈希'],
    })
    expect(await db.leetCodeProgress.get('two-sum')).toMatchObject({
      status: 'solved', solvedDate: '2026-07-03', solutionSummary: '哈希一次遍历', queueOrder: 1,
    })
    expect(await db.leetCodeProgress.get('add-two-numbers')).toMatchObject({ queueOrder: 2 })
    expect(await db.leetCodeReviews.where('slug').equals('two-sum').toArray()).toHaveLength(4)
  })
})
