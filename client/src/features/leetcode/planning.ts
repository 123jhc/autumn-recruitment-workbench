import type { Difficulty, ProblemStatus } from '@autumn-recruitment/shared'

export interface QueueProblem {
  slug: string
  status: ProblemStatus
  queueOrder: number
}

export interface ScheduleInput {
  problems: QueueProblem[]
  startDate: string
  endDate: string
  weekdays: number[]
}

export interface ScheduleAssignment {
  slug: string
  plannedDate: string
  queueOrder: number
}

export interface FilterableProblemRow {
  difficulty: Difficulty
  status: ProblemStatus
  topic?: string
  tags: string[]
}

export interface ProblemFilters {
  difficulty?: Difficulty
  status?: ProblemStatus
  topic?: string
  tag?: string
}

export function buildSchedule(input: ScheduleInput): ScheduleAssignment[] {
  const start = parseDate(input.startDate)
  const end = parseDate(input.endDate)
  if (start.getTime() > end.getTime()) throw new Error('开始日期不能晚于截止日期')
  if (input.weekdays.length === 0) throw new Error('请至少选择一个刷题日')

  const selected = new Set(input.weekdays)
  const studyDates: string[] = []
  for (const cursor = new Date(start); cursor.getTime() <= end.getTime(); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const weekday = cursor.getUTCDay() === 0 ? 7 : cursor.getUTCDay()
    if (selected.has(weekday)) studyDates.push(formatDate(cursor))
  }
  if (studyDates.length === 0) throw new Error('所选日期范围内没有可用刷题日')

  const unfinished = input.problems
    .filter((problem) => problem.status === 'todo')
    .sort((a, b) => a.queueOrder - b.queueOrder)

  const base = Math.floor(unfinished.length / studyDates.length)
  let remainder = unfinished.length % studyDates.length
  let problemIndex = 0
  const result: ScheduleAssignment[] = []

  for (const plannedDate of studyDates) {
    const count = base + (remainder > 0 ? 1 : 0)
    remainder = Math.max(0, remainder - 1)
    for (let index = 0; index < count; index++) {
      const problem = unfinished[problemIndex++]
      if (!problem) break
      result.push({ slug: problem.slug, plannedDate, queueOrder: result.length + 1 })
    }
  }
  return result
}

export function moveInQueue<T extends QueueProblem>(rows: T[], slug: string, offset: -1 | 1): T[] {
  const unfinished = rows.filter((row) => row.status === 'todo').sort((a, b) => a.queueOrder - b.queueOrder)
  const from = unfinished.findIndex((row) => row.slug === slug)
  const to = from + offset
  if (from < 0 || to < 0 || to >= unfinished.length) return rows

  const [moved] = unfinished.splice(from, 1)
  unfinished.splice(to, 0, moved)
  return [
    ...rows.filter((row) => row.status === 'solved'),
    ...unfinished.map((row, index) => ({ ...row, queueOrder: index + 1 })),
  ]
}

export function filterProblemRows<T extends FilterableProblemRow>(rows: T[], filters: ProblemFilters): T[] {
  const tag = filters.tag?.trim().toLowerCase()
  return rows.filter((row) =>
    (!filters.difficulty || row.difficulty === filters.difficulty) &&
    (!filters.status || row.status === filters.status) &&
    (!filters.topic || row.topic === filters.topic) &&
    (!tag || row.tags.some((item) => item.toLowerCase().includes(tag))),
  )
}

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('日期格式必须为 YYYY-MM-DD')
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || formatDate(date) !== value) throw new Error('日期无效')
  return date
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
