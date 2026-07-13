import { db } from '../db/database.js'
import { nanoid } from 'nanoid'
import type { Task, TaskCategory, TaskStatus, TaskSource, TaskPriority } from '@autumn-recruitment/shared'

export const taskDal = {
  async getAll(): Promise<Task[]> {
    return db.tasks.toArray()
  },

  async getById(id: string): Promise<Task | undefined> {
    return db.tasks.get(id)
  },

  async getTodayTasks(today: string): Promise<Task[]> {
    const all = await db.tasks.toArray()
    return all.filter(
      (t) =>
        t.plannedDate === today ||
        t.dueDate === today ||
        (t.status === 'todo' && t.dueDate != null && t.dueDate < today),
    )
  },

  async getWeekTasks(weekStart: string, weekEnd: string): Promise<Task[]> {
    const all = await db.tasks.toArray()
    return all.filter((t) => {
      const inRange = (d?: string) => d != null && d >= weekStart && d <= weekEnd
      return inRange(t.plannedDate) || inRange(t.dueDate)
    })
  },

  async getOverdueTasks(today: string): Promise<Task[]> {
    return db.tasks
      .where('status')
      .equals('todo')
      .filter((t) => t.dueDate != null && t.dueDate < today)
      .toArray()
  },

  async getByCategory(category: TaskCategory): Promise<Task[]> {
    return db.tasks.where('category').equals(category).toArray()
  },

  async getBySource(source: TaskSource, sourceId?: string): Promise<Task[]> {
    const bySource = await db.tasks.where('source').equals(source).toArray()
    if (sourceId == null) return bySource
    return bySource.filter((t) => t.sourceId === sourceId)
  },

  async create(input: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const now = new Date().toISOString()
    const task: Task = {
      ...input,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    }
    await db.tasks.add(task)
    return task
  },

  async update(id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<Task> {
    const existing = await db.tasks.get(id)
    if (existing == null) throw new Error(`Task not found: ${id}`)
    const updated: Task = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }
    await db.tasks.put(updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    await db.tasks.delete(id)
  },

  async complete(id: string): Promise<Task> {
    const existing = await db.tasks.get(id)
    if (existing == null) throw new Error(`Task not found: ${id}`)
    const now = new Date().toISOString()
    const updated: Task = {
      ...existing,
      status: 'done' as TaskStatus,
      completedAt: now,
      updatedAt: now,
    }
    await db.tasks.put(updated)
    return updated
  },

  async uncomplete(id: string): Promise<Task> {
    const existing = await db.tasks.get(id)
    if (existing == null) throw new Error(`Task not found: ${id}`)
    const now = new Date().toISOString()
    const updated: Task = {
      ...existing,
      status: 'todo' as TaskStatus,
      completedAt: undefined,
      updatedAt: now,
    }
    await db.tasks.put(updated)
    return updated
  },

  async bulkCreate(items: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Task[]> {
    const now = new Date().toISOString()
    const tasks: Task[] = items.map((item) => ({
      ...item,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    }))
    await db.tasks.bulkAdd(tasks)
    return tasks
  },

  async countByStatus(): Promise<{ todo: number; done: number }> {
    const all = await db.tasks.toArray()
    let todo = 0
    let done = 0
    for (const t of all) {
      if (t.status === 'todo') todo++
      else if (t.status === 'done') done++
    }
    return { todo, done }
  },
}
