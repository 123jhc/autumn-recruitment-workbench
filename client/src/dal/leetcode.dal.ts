import { db } from '../db/database.js'
import { nanoid } from 'nanoid'
import type { LeetCodeProblem, Difficulty, ProblemStatus } from '@autumn-recruitment/shared'

export const leetCodeDal = {
  async getAll(): Promise<LeetCodeProblem[]> {
    return db.leetCodeProblems.toArray()
  },

  async getById(id: string): Promise<LeetCodeProblem | undefined> {
    return db.leetCodeProblems.get(id)
  },

  async getByStatus(status: ProblemStatus): Promise<LeetCodeProblem[]> {
    return db.leetCodeProblems.where('status').equals(status).toArray()
  },

  async getByDifficulty(difficulty: Difficulty): Promise<LeetCodeProblem[]> {
    return db.leetCodeProblems.where('difficulty').equals(difficulty).toArray()
  },

  async getReviewDue(today: string): Promise<LeetCodeProblem[]> {
    return db.leetCodeProblems
      .where('status')
      .equals('review')
      .filter((p) => p.reviewDate != null && p.reviewDate <= today)
      .toArray()
  },

  async getSolvedThisWeek(weekStart: string, weekEnd: string): Promise<LeetCodeProblem[]> {
    return db.leetCodeProblems
      .where('status')
      .equals('solved')
      .filter((p) => p.solvedDate != null && p.solvedDate >= weekStart && p.solvedDate <= weekEnd)
      .toArray()
  },

  async countByDifficultyAndStatus(): Promise<Record<string, number>> {
    const all = await db.leetCodeProblems.toArray()
    const counts: Record<string, number> = {}
    for (const p of all) {
      const key = `${p.difficulty}:${p.status}`
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  },

  async create(input: Omit<LeetCodeProblem, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeetCodeProblem> {
    const now = new Date().toISOString()
    const record: LeetCodeProblem = {
      ...input,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    }
    await db.leetCodeProblems.add(record)
    return record
  },

  async update(id: string, patch: Partial<Omit<LeetCodeProblem, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeetCodeProblem> {
    const existing = await db.leetCodeProblems.get(id)
    if (existing == null) throw new Error(`LeetCodeProblem not found: ${id}`)
    const updated: LeetCodeProblem = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }
    await db.leetCodeProblems.put(updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    await db.leetCodeProblems.delete(id)
  },
}
