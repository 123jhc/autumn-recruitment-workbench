import { describe, expect, it } from 'vitest'
import { buildSchedule, filterProblemRows, moveInQueue } from '../planning'

describe('buildSchedule', () => {
  it('distributes unfinished problems evenly across selected weekdays', () => {
    const assignments = buildSchedule({
      problems: [
        { slug: 'a', status: 'todo', queueOrder: 1 },
        { slug: 'b', status: 'solved', queueOrder: 2 },
        { slug: 'c', status: 'todo', queueOrder: 3 },
        { slug: 'd', status: 'todo', queueOrder: 4 },
        { slug: 'e', status: 'todo', queueOrder: 5 },
        { slug: 'f', status: 'todo', queueOrder: 6 },
      ],
      startDate: '2026-07-13',
      endDate: '2026-07-17',
      weekdays: [1, 3, 5],
    })

    expect(assignments).toEqual([
      { slug: 'a', plannedDate: '2026-07-13', queueOrder: 1 },
      { slug: 'c', plannedDate: '2026-07-13', queueOrder: 2 },
      { slug: 'd', plannedDate: '2026-07-15', queueOrder: 3 },
      { slug: 'e', plannedDate: '2026-07-15', queueOrder: 4 },
      { slug: 'f', plannedDate: '2026-07-17', queueOrder: 5 },
    ])
  })

  it('rejects invalid date ranges and ranges without selected study days', () => {
    const problems = [{ slug: 'a', status: 'todo' as const, queueOrder: 1 }]

    expect(() => buildSchedule({ problems, startDate: '2026-07-18', endDate: '2026-07-17', weekdays: [1] }))
      .toThrow('开始日期不能晚于截止日期')
    expect(() => buildSchedule({ problems, startDate: '2026-07-13', endDate: '2026-07-17', weekdays: [] }))
      .toThrow('请至少选择一个刷题日')
    expect(() => buildSchedule({ problems, startDate: '2026-07-13', endDate: '2026-07-13', weekdays: [2] }))
      .toThrow('所选日期范围内没有可用刷题日')
  })
})

describe('moveInQueue', () => {
  it('moves only unfinished problems and leaves completed rows untouched', () => {
    const rows = [
      { slug: 'done', status: 'solved' as const, queueOrder: 1 },
      { slug: 'a', status: 'todo' as const, queueOrder: 2 },
      { slug: 'b', status: 'todo' as const, queueOrder: 3 },
    ]

    expect(moveInQueue(rows, 'b', -1)).toEqual([
      { slug: 'done', status: 'solved', queueOrder: 1 },
      { slug: 'b', status: 'todo', queueOrder: 1 },
      { slug: 'a', status: 'todo', queueOrder: 2 },
    ])
  })
})

describe('filterProblemRows', () => {
  const rows = [
    { slug: 'a', difficulty: 'easy' as const, status: 'todo' as const, topic: '哈希', tags: ['哈希', '数组'] },
    { slug: 'b', difficulty: 'easy' as const, status: 'solved' as const, topic: '链表', tags: ['链表'] },
    { slug: 'c', difficulty: 'hard' as const, status: 'todo' as const, topic: '哈希', tags: ['哈希', '字符串'] },
  ]

  it('combines difficulty, status, topic and tag filters with AND semantics', () => {
    expect(filterProblemRows(rows, { difficulty: 'easy', status: 'todo', topic: '哈希', tag: '数组' }))
      .toEqual([rows[0]])
    expect(filterProblemRows(rows, { difficulty: 'easy', status: 'todo', topic: '链表' }))
      .toEqual([])
  })
})
