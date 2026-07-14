import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/database'
import { leetCodeDal } from '../leetcode.dal'

const CONFIG = {
  listId: 'hot-100',
  startDate: '2026-07-13',
  endDate: '2026-08-31',
  weekdays: [1, 2, 3, 4, 5],
}

describe('leetCodeDal normalized storage', () => {
  beforeEach(async () => {
    await db.transaction('rw', [
      db.leetCodeCatalog,
      db.leetCodeListEntries,
      db.leetCodeProgress,
      db.leetCodeReviews,
      db.leetCodeSchedules,
    ], async () => {
      await Promise.all([
        db.leetCodeCatalog.clear(),
        db.leetCodeListEntries.clear(),
        db.leetCodeProgress.clear(),
        db.leetCodeReviews.clear(),
        db.leetCodeSchedules.clear(),
      ])
    })
  })

  it('initializes all 100 problems and preserves matching personal progress', async () => {
    const now = new Date().toISOString()
    await db.leetCodeCatalog.add({
      slug: 'two-sum', number: 1, title: '旧标题', url: '', difficulty: 'easy', tags: [], source: 'custom', updatedAt: now,
    })
    await db.leetCodeProgress.add({
      slug: 'two-sum', status: 'solved', solvedDate: '2026-07-01', solutionSummary: '哈希一次遍历', queueOrder: 99, createdAt: now, updatedAt: now,
    })

    const result = await leetCodeDal.initializeHot100(CONFIG)
    const rows = await leetCodeDal.getAll()
    const twoSum = rows.find((row) => row.slug === 'two-sum')

    expect(result).toEqual({ added: 99, matched: 1, total: 100 })
    expect(rows).toHaveLength(100)
    expect(twoSum).toMatchObject({
      title: '两数之和', status: 'solved', solvedDate: '2026-07-01', solutionSummary: '哈希一次遍历',
    })
    expect(twoSum?.plannedDate).toBeUndefined()
    expect(await db.leetCodeListEntries.count()).toBe(100)
  })

  it('blocks slug/number conflicts before writing list data', async () => {
    const now = new Date().toISOString()
    await db.leetCodeCatalog.bulkAdd([
      { slug: 'two-sum', number: 999, title: 'A', url: '', difficulty: 'easy', tags: [], source: 'custom', updatedAt: now },
      { slug: 'other-one', number: 1, title: 'B', url: '', difficulty: 'easy', tags: [], source: 'custom', updatedAt: now },
    ])

    await expect(leetCodeDal.initializeHot100(CONFIG)).rejects.toThrow('题号或 slug 冲突')
    expect(await db.leetCodeListEntries.count()).toBe(0)
  })

  it('reschedules only unfinished problems', async () => {
    await leetCodeDal.initializeHot100(CONFIG)
    const first = (await leetCodeDal.getAll()).find((row) => row.status === 'todo')!
    await leetCodeDal.complete(first.slug, '2026-07-14')
    const completedBefore = await leetCodeDal.getById(first.slug)

    await leetCodeDal.reschedule({ ...CONFIG, startDate: '2026-08-03', endDate: '2026-09-30' })
    const completedAfter = await leetCodeDal.getById(first.slug)
    const unfinished = (await leetCodeDal.getAll()).filter((row) => row.status === 'todo')

    expect(completedAfter?.plannedDate).toBe(completedBefore?.plannedDate)
    expect(unfinished.every((row) => row.plannedDate != null && row.plannedDate >= '2026-08-03')).toBe(true)
  })

  it('rejects moving an expired schedule before changing queue order', async () => {
    await leetCodeDal.initializeHot100(CONFIG)
    const before = await db.leetCodeProgress.orderBy('queueOrder').toArray()
    const first = before.find((row) => row.status === 'todo')!

    await expect(leetCodeDal.moveProblem(first.slug, 1, '2026-09-01'))
      .rejects.toThrow('计划已过期，请先重新排期')

    const after = await db.leetCodeProgress.orderBy('queueOrder').toArray()
    expect(after).toEqual(before)
  })

  it('clears only pending reviews when reviewDate is explicitly undefined', async () => {
    const problem = await leetCodeDal.create({
      title: '自定义题', difficulty: 'easy', tags: [], status: 'review', reviewDate: '2026-07-20',
    })
    const now = new Date().toISOString()
    await db.leetCodeReviews.add({
      id: 'completed-review', slug: problem.slug, scheduledDate: '2026-07-01',
      completedAt: '2026-07-02T00:00:00.000Z', outcome: 'mastered', createdAt: now, updatedAt: now,
    })

    const updated = await leetCodeDal.update(problem.slug, { reviewDate: undefined })

    const reviews = await db.leetCodeReviews.where('slug').equals(problem.slug).toArray()
    expect(reviews.filter((review) => !review.completedAt)).toEqual([])
    expect(reviews.filter((review) => review.completedAt).map((review) => review.id)).toEqual(['completed-review'])
    expect(updated.reviewDate).toBeUndefined()
    expect(updated.lastReviewedAt).toBe('2026-07-02T00:00:00.000Z')
  })

  it('keeps reviews unchanged when reviewDate is omitted from an update', async () => {
    const problem = await leetCodeDal.create({
      title: '自定义题', difficulty: 'easy', tags: [], status: 'review', reviewDate: '2026-07-20',
    })
    const before = await db.leetCodeReviews.where('slug').equals(problem.slug).toArray()

    await leetCodeDal.update(problem.slug, { title: '更新后标题' })

    expect(await db.leetCodeReviews.where('slug').equals(problem.slug).toArray()).toEqual(before)
  })

  it('replaces pending reviews when reviewDate is updated to a new date', async () => {
    const problem = await leetCodeDal.create({
      title: '自定义题', difficulty: 'easy', tags: [], status: 'review', reviewDate: '2026-07-20',
    })
    const previous = await db.leetCodeReviews.where('slug').equals(problem.slug).first()

    const updated = await leetCodeDal.update(problem.slug, { reviewDate: '2026-07-25' })

    const pending = await db.leetCodeReviews.where('slug').equals(problem.slug)
      .and((review) => !review.completedAt).toArray()
    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatchObject({ slug: problem.slug, scheduledDate: '2026-07-25' })
    expect(pending[0].id).not.toBe(previous?.id)
    expect(updated.reviewDate).toBe('2026-07-25')
  })
})
