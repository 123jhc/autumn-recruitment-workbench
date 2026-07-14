export type Difficulty = 'easy' | 'medium' | 'hard'
export type ProblemStatus = 'todo' | 'solved' | 'review'
export type ProgressStatus = 'todo' | 'solved'

export interface LeetCodeCatalogProblem {
  slug: string
  number?: number
  title: string
  url: string
  difficulty: Difficulty
  tags: string[]
  source: 'builtin' | 'custom'
  updatedAt: string
}

export interface LeetCodeListEntry {
  id: string
  listId: string
  slug: string
  topic: string
  recommendedOrder: number
}

export interface LeetCodeProgress {
  slug: string
  status: ProgressStatus
  plannedDate?: string
  solvedDate?: string
  solutionSummary?: string
  queueOrder: number
  createdAt: string
  updatedAt: string
}

export interface LeetCodeReviewRecord {
  id: string
  slug: string
  scheduledDate: string
  completedAt?: string
  outcome?: 'mastered' | 'repeat'
  createdAt: string
  updatedAt: string
}

export interface LeetCodeSchedule {
  id: string
  listId: string
  startDate: string
  endDate: string
  weekdays: number[]
  createdAt: string
  updatedAt: string
}

/** Joined read model used by pages. Storage remains normalized across the records above. */
export interface LeetCodeProblem {
  id: string
  slug: string
  number?: number
  title: string
  url?: string
  difficulty: Difficulty
  tags: string[]
  topic?: string
  listId?: string
  status: ProblemStatus
  plannedDate?: string
  solutionSummary?: string
  solvedDate?: string
  reviewDate?: string
  lastReviewedAt?: string
  queueOrder: number
  createdAt: string
  updatedAt: string
}

/** Version-1 storage/backup shape retained only for migration. */
export interface LegacyLeetCodeProblem {
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
