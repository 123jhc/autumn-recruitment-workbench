import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { AppDatabase, db } from '../database'

const DATABASE_NAME = 'AutumnRecruitmentDB'

describe('database v1 upgrade', () => {
  afterEach(async () => {
    db.close()
    await Dexie.delete(DATABASE_NAME)
    await db.open()
  })

  it('merges duplicate legacy URLs and keeps every review record', async () => {
    db.close()
    await Dexie.delete(DATABASE_NAME)
    const legacyDb = new Dexie(DATABASE_NAME)
    legacyDb.version(1).stores({
      tasks: 'id, category, status, source, sourceId, plannedDate, dueDate, createdAt',
      taskDrafts: 'id, importId',
      planImports: 'id, status, createdAt',
      applications: 'id, company, role, status, nextActionDate, createdAt',
      leetCodeProblems: 'id, number, difficulty, status, reviewDate, solvedDate, createdAt',
    })
    await legacyDb.table('leetCodeProblems').bulkAdd([
      {
        id: 'first', title: '待办版本', url: 'https://leetcode.cn/problems/two-sum/', difficulty: 'easy', tags: [], status: 'todo',
        reviewDate: '2026-08-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-03T00:00:00.000Z',
      },
      {
        id: 'duplicate', title: '复习版本', url: 'https://leetcode.cn/problems/two-sum/', difficulty: 'medium', tags: ['哈希'], status: 'review',
        solvedDate: '2026-07-02', solutionSummary: '保留摘要', lastReviewedAt: '2026-07-04T08:00:00.000Z',
        createdAt: '2026-07-02T00:00:00.000Z', updatedAt: '2026-07-04T00:00:00.000Z',
      },
    ])
    legacyDb.close()

    const upgraded = new AppDatabase()
    await upgraded.open()

    expect(await upgraded.leetCodeCatalog.toArray()).toHaveLength(1)
    expect(await upgraded.leetCodeCatalog.get('two-sum')).toMatchObject({ title: '复习版本' })
    expect(await upgraded.leetCodeProgress.get('two-sum')).toMatchObject({
      status: 'solved', solvedDate: '2026-07-02', solutionSummary: '保留摘要', queueOrder: 1,
    })
    expect(await upgraded.leetCodeReviews.where('slug').equals('two-sum').toArray()).toHaveLength(2)
    upgraded.close()
  })
})
