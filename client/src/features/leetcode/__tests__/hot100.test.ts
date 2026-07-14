import { describe, expect, it } from 'vitest'
import { HOT_100_LIST_ID, HOT_100_PROBLEMS, HOT_100_TOPICS } from '../hot100'

describe('HOT_100_PROBLEMS', () => {
  it('contains exactly 100 unique, ordered problems', () => {
    expect(HOT_100_LIST_ID).toBe('hot-100')
    expect(HOT_100_PROBLEMS).toHaveLength(100)
    expect(new Set(HOT_100_PROBLEMS.map((item) => item.slug)).size).toBe(100)
    expect(new Set(HOT_100_PROBLEMS.map((item) => item.number)).size).toBe(100)
    expect(HOT_100_PROBLEMS.map((item) => item.recommendedOrder)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1),
    )
  })

  it('keeps every problem in the stable topic progression with valid metadata', () => {
    const topicIndexes = HOT_100_PROBLEMS.map((item) => HOT_100_TOPICS.indexOf(item.topic))

    expect(topicIndexes.every((index) => index >= 0)).toBe(true)
    expect(topicIndexes).toEqual([...topicIndexes].sort((a, b) => a - b))

    for (const item of HOT_100_PROBLEMS) {
      expect(item.title.trim()).not.toBe('')
      expect(item.url).toBe(`https://leetcode.cn/problems/${item.slug}/`)
      expect(['easy', 'medium', 'hard']).toContain(item.difficulty)
      expect(item.tags).toContain(item.topic)
    }
  })
})
