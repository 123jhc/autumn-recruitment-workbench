export type Difficulty = 'easy' | 'medium' | 'hard'
export type ProblemStatus = 'todo' | 'solved' | 'review'

export interface LeetCodeProblem {
  id: string
  number?: number
  title: string
  url?: string
  difficulty: Difficulty
  tags: string[]
  status: ProblemStatus
  solutionSummary?: string
  solvedDate?: string
  reviewDate?: string
  lastReviewedAt?: string
  createdAt: string
  updatedAt: string
}
