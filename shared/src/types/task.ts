export type TaskStatus = 'todo' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskCategory = 'resume' | 'project' | 'algorithm' | 'knowledge' | 'application' | 'interview' | 'other'
export type TaskSource = 'manual' | 'plan' | 'application'

export interface Task {
  id: string
  title: string
  category: TaskCategory
  plannedDate?: string
  dueDate?: string
  priority: TaskPriority
  estimatedMinutes?: number
  status: TaskStatus
  notes?: string
  source: TaskSource
  sourceId?: string
  createdAt: string
  completedAt?: string
  updatedAt: string
}
