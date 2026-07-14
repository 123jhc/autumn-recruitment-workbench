import { db } from '../db/database.js'
import { nanoid } from 'nanoid'
import type {
  Difficulty,
  LeetCodeCatalogProblem,
  LeetCodeListEntry,
  LeetCodeProblem,
  LeetCodeProgress,
  LeetCodeReviewRecord,
  LeetCodeSchedule,
  ProblemStatus,
} from '@autumn-recruitment/shared'
import { HOT_100_LIST_ID, HOT_100_PROBLEMS } from '../features/leetcode/hot100'
import { buildSchedule, moveInQueue } from '../features/leetcode/planning'

export interface ScheduleConfigInput {
  listId: string
  startDate: string
  endDate: string
  weekdays: number[]
}

export interface LeetCodeProblemInput {
  number?: number
  title: string
  url?: string
  difficulty: Difficulty
  tags: string[]
  status: ProblemStatus
  solutionSummary?: string
  solvedDate?: string
  reviewDate?: string
}

const ALL_TABLES = [
  db.leetCodeCatalog,
  db.leetCodeListEntries,
  db.leetCodeProgress,
  db.leetCodeReviews,
  db.leetCodeSchedules,
]

export const leetCodeDal = {
  async getAll(): Promise<LeetCodeProblem[]> {
    const [catalog, entries, progress, reviews] = await Promise.all([
      db.leetCodeCatalog.toArray(),
      db.leetCodeListEntries.toArray(),
      db.leetCodeProgress.toArray(),
      db.leetCodeReviews.toArray(),
    ])
    return joinProblems(catalog, entries, progress, reviews)
  },

  async getById(slug: string): Promise<LeetCodeProblem | undefined> {
    return (await this.getAll()).find((problem) => problem.slug === slug)
  },

  async getByStatus(status: ProblemStatus): Promise<LeetCodeProblem[]> {
    return (await this.getAll()).filter((problem) => problem.status === status)
  },

  async getByDifficulty(difficulty: Difficulty): Promise<LeetCodeProblem[]> {
    return (await this.getAll()).filter((problem) => problem.difficulty === difficulty)
  },

  async getReviewDue(today: string): Promise<LeetCodeProblem[]> {
    return (await this.getAll()).filter((problem) => problem.reviewDate != null && problem.reviewDate <= today)
  },

  async getSolvedThisWeek(weekStart: string, weekEnd: string): Promise<LeetCodeProblem[]> {
    return (await this.getAll()).filter((problem) =>
      problem.solvedDate != null && problem.solvedDate >= weekStart && problem.solvedDate <= weekEnd,
    )
  },

  async countByDifficultyAndStatus(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {}
    for (const problem of await this.getAll()) {
      const key = `${problem.difficulty}:${problem.status}`
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  },

  async getSchedule(listId = HOT_100_LIST_ID): Promise<LeetCodeSchedule | undefined> {
    return db.leetCodeSchedules.get(listId)
  },

  async initializeHot100(config: ScheduleConfigInput): Promise<{ added: number; matched: number; total: number }> {
    const existingCatalog = await db.leetCodeCatalog.toArray()
    const existingProgress = await db.leetCodeProgress.toArray()
    const existingReviews = await db.leetCodeReviews.toArray()
    const matches = resolveMatches(existingCatalog)
    const now = new Date().toISOString()

    const progressBySlug = new Map(existingProgress.map((item) => [item.slug, item]))
    const reviewsBySlug = new Map<string, LeetCodeReviewRecord[]>()
    for (const review of existingReviews) {
      reviewsBySlug.set(review.slug, [...(reviewsBySlug.get(review.slug) ?? []), review])
    }

    const catalogRows: LeetCodeCatalogProblem[] = []
    const listRows: LeetCodeListEntry[] = []
    const progressRows: LeetCodeProgress[] = []
    const reviewRows: LeetCodeReviewRecord[] = []
    const oldSlugsToDelete: string[] = []
    let added = 0

    for (const seed of HOT_100_PROBLEMS) {
      const existing = matches.get(seed.slug)
      if (!existing) added++
      if (existing && existing.slug !== seed.slug) oldSlugsToDelete.push(existing.slug)

      catalogRows.push({
        slug: seed.slug,
        number: seed.number,
        title: seed.title,
        url: seed.url,
        difficulty: seed.difficulty,
        tags: seed.tags,
        source: 'builtin',
        updatedAt: now,
      })
      listRows.push({
        id: `${HOT_100_LIST_ID}:${seed.slug}`,
        listId: HOT_100_LIST_ID,
        slug: seed.slug,
        topic: seed.topic,
        recommendedOrder: seed.recommendedOrder,
      })

      const preserved = existing ? progressBySlug.get(existing.slug) : undefined
      progressRows.push(preserved ? { ...preserved, slug: seed.slug } : {
        slug: seed.slug,
        status: 'todo',
        queueOrder: seed.recommendedOrder,
        createdAt: now,
        updatedAt: now,
      })
      for (const review of existing ? reviewsBySlug.get(existing.slug) ?? [] : []) {
        reviewRows.push({ ...review, slug: seed.slug })
      }
    }

    const assignments = buildSchedule({
      problems: progressRows,
      startDate: config.startDate,
      endDate: config.endDate,
      weekdays: config.weekdays,
    })
    const assignmentBySlug = new Map(assignments.map((item) => [item.slug, item]))
    const scheduledProgress = progressRows.map((progress) => {
      if (progress.status === 'solved') return progress
      const assignment = assignmentBySlug.get(progress.slug)
      return { ...progress, plannedDate: assignment?.plannedDate, queueOrder: assignment?.queueOrder ?? progress.queueOrder, updatedAt: now }
    })
    const existingSchedule = await db.leetCodeSchedules.get(config.listId)
    const schedule: LeetCodeSchedule = {
      id: config.listId,
      ...config,
      createdAt: existingSchedule?.createdAt ?? now,
      updatedAt: now,
    }

    await db.transaction('rw', ALL_TABLES, async () => {
      for (const oldSlug of oldSlugsToDelete) {
        await db.leetCodeCatalog.delete(oldSlug)
        await db.leetCodeProgress.delete(oldSlug)
        await db.leetCodeReviews.where('slug').equals(oldSlug).delete()
      }
      await db.leetCodeCatalog.bulkPut(catalogRows)
      await db.leetCodeListEntries.bulkPut(listRows)
      await db.leetCodeProgress.bulkPut(scheduledProgress)
      if (reviewRows.length > 0) await db.leetCodeReviews.bulkPut(reviewRows)
      await db.leetCodeSchedules.put(schedule)
    })

    return { added, matched: HOT_100_PROBLEMS.length - added, total: HOT_100_PROBLEMS.length }
  },

  async reschedule(config: ScheduleConfigInput): Promise<void> {
    const entries = await db.leetCodeListEntries.where('listId').equals(config.listId).toArray()
    const progress = await db.leetCodeProgress.bulkGet(entries.map((entry) => entry.slug))
    const rows = progress.filter((item): item is LeetCodeProgress => item != null)
    const assignments = buildSchedule({ problems: rows, ...config })
    const bySlug = new Map(assignments.map((item) => [item.slug, item]))
    const now = new Date().toISOString()
    const scheduleBefore = await db.leetCodeSchedules.get(config.listId)

    await db.transaction('rw', [db.leetCodeProgress, db.leetCodeSchedules], async () => {
      await db.leetCodeProgress.bulkPut(rows.map((row) => row.status === 'solved' ? row : {
        ...row,
        plannedDate: bySlug.get(row.slug)?.plannedDate,
        queueOrder: bySlug.get(row.slug)?.queueOrder ?? row.queueOrder,
        updatedAt: now,
      }))
      await db.leetCodeSchedules.put({
        id: config.listId, ...config, createdAt: scheduleBefore?.createdAt ?? now, updatedAt: now,
      })
    })
  },

  async moveProblem(slug: string, direction: -1 | 1, today: string): Promise<void> {
    const schedule = await this.getSchedule()
    if (!schedule) throw new Error('请先初始化题单')
    if (today > schedule.endDate) throw new Error('计划已过期，请先重新排期')
    const entries = await db.leetCodeListEntries.where('listId').equals(schedule.listId).toArray()
    const progress = (await db.leetCodeProgress.bulkGet(entries.map((item) => item.slug)))
      .filter((item): item is LeetCodeProgress => item != null)
    const orderBefore = progress.filter((item) => item.status === 'todo')
      .sort((a, b) => a.queueOrder - b.queueOrder)
      .map((item) => item.slug)
    const reordered = moveInQueue(progress, slug, direction)
    const orderAfter = reordered.filter((item) => item.status === 'todo')
      .sort((a, b) => a.queueOrder - b.queueOrder)
      .map((item) => item.slug)
    if (orderBefore.every((item, index) => item === orderAfter[index])) return
    const startDate = today > schedule.startDate ? today : schedule.startDate
    const assignments = buildSchedule({
      problems: reordered,
      startDate,
      endDate: schedule.endDate,
      weekdays: schedule.weekdays,
    })
    const bySlug = new Map(assignments.map((item) => [item.slug, item]))
    const now = new Date().toISOString()
    const scheduledProgress = reordered.map((row) => row.status === 'solved' ? row : {
      ...row,
      plannedDate: bySlug.get(row.slug)?.plannedDate,
      queueOrder: bySlug.get(row.slug)?.queueOrder ?? row.queueOrder,
      updatedAt: now,
    })

    await db.transaction('rw', [db.leetCodeProgress, db.leetCodeSchedules], async () => {
      await db.leetCodeProgress.bulkPut(scheduledProgress)
      await db.leetCodeSchedules.put({ ...schedule, startDate, updatedAt: now })
    })
  },

  async create(input: LeetCodeProblemInput): Promise<LeetCodeProblem> {
    const now = new Date().toISOString()
    const slug = slugFromUrl(input.url) ?? `custom-${nanoid()}`
    const queueOrder = (await db.leetCodeProgress.orderBy('queueOrder').last())?.queueOrder ?? 0
    const status = input.status === 'todo' ? 'todo' : 'solved'
    await db.transaction('rw', [db.leetCodeCatalog, db.leetCodeProgress, db.leetCodeReviews], async () => {
      await db.leetCodeCatalog.add({
        slug, number: input.number, title: input.title, url: input.url ?? '', difficulty: input.difficulty,
        tags: input.tags, source: 'custom', updatedAt: now,
      })
      await db.leetCodeProgress.add({
        slug, status, solvedDate: status === 'solved' ? input.solvedDate : undefined,
        solutionSummary: input.solutionSummary, queueOrder: queueOrder + 1, createdAt: now, updatedAt: now,
      })
      if (input.reviewDate) await db.leetCodeReviews.add(newReview(slug, input.reviewDate, now))
    })
    return (await this.getById(slug))!
  },

  async update(slug: string, patch: Partial<LeetCodeProblemInput>): Promise<LeetCodeProblem> {
    const catalog = await db.leetCodeCatalog.get(slug)
    const progress = await db.leetCodeProgress.get(slug)
    if (!catalog || !progress) throw new Error(`LeetCodeProblem not found: ${slug}`)
    const now = new Date().toISOString()
    const status = patch.status ? (patch.status === 'todo' ? 'todo' : 'solved') : progress.status

    await db.transaction('rw', [db.leetCodeCatalog, db.leetCodeProgress, db.leetCodeReviews], async () => {
      await db.leetCodeCatalog.put({
        ...catalog,
        number: hasOwn(patch, 'number') ? patch.number : catalog.number,
        title: patch.title ?? catalog.title,
        url: hasOwn(patch, 'url') ? (patch.url ?? '') : catalog.url,
        difficulty: patch.difficulty ?? catalog.difficulty,
        tags: patch.tags ?? catalog.tags,
        updatedAt: now,
      })
      await db.leetCodeProgress.put({
        ...progress,
        status,
        solvedDate: status === 'todo'
          ? undefined
          : hasOwn(patch, 'solvedDate') ? patch.solvedDate : progress.solvedDate,
        solutionSummary: hasOwn(patch, 'solutionSummary') ? patch.solutionSummary : progress.solutionSummary,
        updatedAt: now,
      })
      if (Object.prototype.hasOwnProperty.call(patch, 'reviewDate')) {
        await db.leetCodeReviews.where('slug').equals(slug).and((review) => !review.completedAt).delete()
        if (patch.reviewDate) await db.leetCodeReviews.add(newReview(slug, patch.reviewDate, now))
      }
    })
    return (await this.getById(slug))!
  },

  async complete(slug: string, solvedDate: string): Promise<LeetCodeProblem> {
    const progress = await db.leetCodeProgress.get(slug)
    if (!progress) throw new Error(`LeetCodeProblem not found: ${slug}`)
    await db.leetCodeProgress.put({ ...progress, status: 'solved', solvedDate, updatedAt: new Date().toISOString() })
    return (await this.getById(slug))!
  },

  async completeReview(slug: string, newReviewDate?: string): Promise<LeetCodeProblem> {
    const pending = await db.leetCodeReviews.where('slug').equals(slug).and((review) => !review.completedAt).first()
    if (!pending) throw new Error(`Review not found: ${slug}`)
    const now = new Date().toISOString()
    await db.transaction('rw', db.leetCodeReviews, async () => {
      await db.leetCodeReviews.put({ ...pending, completedAt: now, outcome: newReviewDate ? 'repeat' : 'mastered', updatedAt: now })
      if (newReviewDate) await db.leetCodeReviews.add(newReview(slug, newReviewDate, now))
    })
    return (await this.getById(slug))!
  },

  async delete(slug: string): Promise<void> {
    await db.transaction('rw', [db.leetCodeCatalog, db.leetCodeListEntries, db.leetCodeProgress, db.leetCodeReviews], async () => {
      await db.leetCodeCatalog.delete(slug)
      await db.leetCodeListEntries.where('slug').equals(slug).delete()
      await db.leetCodeProgress.delete(slug)
      await db.leetCodeReviews.where('slug').equals(slug).delete()
    })
  },
}

function resolveMatches(existing: LeetCodeCatalogProblem[]): Map<string, LeetCodeCatalogProblem | undefined> {
  const result = new Map<string, LeetCodeCatalogProblem | undefined>()
  for (const seed of HOT_100_PROBLEMS) {
    const slugMatches = existing.filter((item) => item.slug === seed.slug)
    const numberMatches = existing.filter((item) => item.number === seed.number)
    const candidates = new Map([...slugMatches, ...numberMatches].map((item) => [item.slug, item]))
    if (candidates.size > 1) throw new Error(`题号或 slug 冲突：#${seed.number} ${seed.title}`)
    result.set(seed.slug, candidates.values().next().value)
  }
  return result
}

function joinProblems(
  catalog: LeetCodeCatalogProblem[],
  entries: LeetCodeListEntry[],
  progress: LeetCodeProgress[],
  reviews: LeetCodeReviewRecord[],
): LeetCodeProblem[] {
  const entryBySlug = new Map(entries.map((item) => [item.slug, item]))
  const progressBySlug = new Map(progress.map((item) => [item.slug, item]))
  const reviewsBySlug = new Map<string, LeetCodeReviewRecord[]>()
  for (const review of reviews) reviewsBySlug.set(review.slug, [...(reviewsBySlug.get(review.slug) ?? []), review])

  return catalog.flatMap((problem) => {
    const personal = progressBySlug.get(problem.slug)
    if (!personal) return []
    const entry = entryBySlug.get(problem.slug)
    const problemReviews = reviewsBySlug.get(problem.slug) ?? []
    const pending = problemReviews.filter((review) => !review.completedAt).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0]
    const lastCompleted = problemReviews.filter((review) => review.completedAt).sort((a, b) => b.completedAt!.localeCompare(a.completedAt!))[0]
    const status: ProblemStatus = personal.status === 'todo' ? 'todo' : pending ? 'review' : 'solved'
    return [{
      id: problem.slug,
      slug: problem.slug,
      number: problem.number,
      title: problem.title,
      url: problem.url || undefined,
      difficulty: problem.difficulty,
      tags: problem.tags,
      topic: entry?.topic,
      listId: entry?.listId,
      status,
      plannedDate: personal.plannedDate,
      solutionSummary: personal.solutionSummary,
      solvedDate: personal.solvedDate,
      reviewDate: pending?.scheduledDate,
      lastReviewedAt: lastCompleted?.completedAt,
      queueOrder: personal.queueOrder,
      createdAt: personal.createdAt,
      updatedAt: personal.updatedAt,
    }]
  }).sort((a, b) => a.queueOrder - b.queueOrder || (a.number ?? Infinity) - (b.number ?? Infinity))
}

function slugFromUrl(url?: string): string | undefined {
  return url?.match(/\/problems\/([^/]+)/)?.[1]
}

function newReview(slug: string, scheduledDate: string, now: string): LeetCodeReviewRecord {
  return { id: nanoid(), slug, scheduledDate, createdAt: now, updatedAt: now }
}

function hasOwn<T extends object>(value: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}
