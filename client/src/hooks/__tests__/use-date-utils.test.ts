import { describe, it, expect } from 'vitest'
import { todayShanghai, weekRangeShanghai, isOverdue } from '../use-date-utils'

describe('todayShanghai', () => {
  it('should return a string in YYYY-MM-DD format', () => {
    const result = todayShanghai()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('weekRangeShanghai', () => {
  it('should return Monday to Sunday for a known Monday', () => {
    // 2026-07-13 is a Monday
    const { start, end } = weekRangeShanghai('2026-07-13')
    expect(start).toBe('2026-07-13')
    expect(end).toBe('2026-07-19')
  })

  it('should return correct range for a Wednesday', () => {
    // 2026-07-15 is a Wednesday
    const { start, end } = weekRangeShanghai('2026-07-15')
    expect(start).toBe('2026-07-13')
    expect(end).toBe('2026-07-19')
  })

  it('should return correct range for a Sunday', () => {
    // 2026-07-19 is a Sunday
    const { start, end } = weekRangeShanghai('2026-07-19')
    expect(start).toBe('2026-07-13')
    expect(end).toBe('2026-07-19')
  })
})

describe('isOverdue', () => {
  it('should return true if dueDate is before today', () => {
    expect(isOverdue('2026-07-10', '2026-07-13')).toBe(true)
  })

  it('should return false if dueDate is today', () => {
    expect(isOverdue('2026-07-13', '2026-07-13')).toBe(false)
  })

  it('should return false if dueDate is after today', () => {
    expect(isOverdue('2026-07-15', '2026-07-13')).toBe(false)
  })

  it('should return false if dueDate is undefined', () => {
    expect(isOverdue(undefined, '2026-07-13')).toBe(false)
  })
})
