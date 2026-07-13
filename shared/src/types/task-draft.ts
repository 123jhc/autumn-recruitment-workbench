import type { TaskCategory, TaskPriority } from './task'

export interface TaskDraft {
  id: string
  importId: string
  title: string
  category: TaskCategory
  plannedDate?: string
  dueDate?: string
  priority: TaskPriority
  estimatedMinutes?: number
  rationale?: string
}
