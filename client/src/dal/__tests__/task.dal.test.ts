import { describe, it, expect, beforeEach } from 'vitest'
import { taskDal } from '../task.dal'
import { db } from '../../db/database'
import type { Task } from '@autumn-recruitment/shared'

function createTaskInput(overrides: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> = {}) {
  return {
    title: '测试任务',
    category: 'other' as const,
    plannedDate: '2026-07-13',
    priority: 'medium' as const,
    status: 'todo' as const,
    source: 'manual' as const,
    ...overrides,
  }
}

describe('taskDal', () => {
  beforeEach(async () => {
    await db.tasks.clear()
  })

  describe('create', () => {
    it('should create a task with generated id and timestamps', async () => {
      const task = await taskDal.create(createTaskInput())
      expect(task.id).toBeDefined()
      expect(task.createdAt).toBeDefined()
      expect(task.updatedAt).toBeDefined()
      expect(task.title).toBe('测试任务')
    })
  })

  describe('getAll', () => {
    it('should return all tasks', async () => {
      await taskDal.create(createTaskInput({ title: 'Task 1' }))
      await taskDal.create(createTaskInput({ title: 'Task 2' }))
      const all = await taskDal.getAll()
      expect(all).toHaveLength(2)
    })
  })

  describe('getTodayTasks', () => {
    it('should return tasks planned for today', async () => {
      await taskDal.create(createTaskInput({ title: 'Today', plannedDate: '2026-07-13' }))
      await taskDal.create(createTaskInput({ title: 'Tomorrow', plannedDate: '2026-07-14' }))
      const todayTasks = await taskDal.getTodayTasks('2026-07-13')
      expect(todayTasks).toHaveLength(1)
      expect(todayTasks[0].title).toBe('Today')
    })

    it('should return tasks with due date today', async () => {
      await taskDal.create(createTaskInput({ title: 'Due', plannedDate: '2026-07-14', dueDate: '2026-07-13' }))
      const todayTasks = await taskDal.getTodayTasks('2026-07-13')
      expect(todayTasks).toHaveLength(1)
    })

    it('should return overdue unfinished tasks', async () => {
      await taskDal.create(createTaskInput({ title: 'Overdue', plannedDate: '2026-07-10', dueDate: '2026-07-10', status: 'todo' }))
      const todayTasks = await taskDal.getTodayTasks('2026-07-13')
      expect(todayTasks).toHaveLength(1)
    })

    it('should NOT return overdue but completed tasks', async () => {
      await taskDal.create(createTaskInput({ title: 'Done', plannedDate: '2026-07-10', dueDate: '2026-07-10', status: 'done' }))
      const todayTasks = await taskDal.getTodayTasks('2026-07-13')
      expect(todayTasks).toHaveLength(0)
    })
  })

  describe('getOverdueTasks', () => {
    it('should return overdue and unfinished tasks only', async () => {
      await taskDal.create(createTaskInput({ title: 'Overdue', dueDate: '2026-07-10', status: 'todo' }))
      await taskDal.create(createTaskInput({ title: 'Done overdue', dueDate: '2026-07-10', status: 'done' }))
      await taskDal.create(createTaskInput({ title: 'Not overdue', dueDate: '2026-07-15', status: 'todo' }))
      const overdue = await taskDal.getOverdueTasks('2026-07-13')
      expect(overdue).toHaveLength(1)
      expect(overdue[0].title).toBe('Overdue')
    })
  })

  describe('complete and uncomplete', () => {
    it('should mark task as done and set completedAt', async () => {
      const task = await taskDal.create(createTaskInput())
      const completed = await taskDal.complete(task.id)
      expect(completed.status).toBe('done')
      expect(completed.completedAt).toBeDefined()
    })

    it('should uncomplete task and clear completedAt', async () => {
      const task = await taskDal.create(createTaskInput({ status: 'done', completedAt: '2026-07-13T10:00:00.000Z' }))
      const uncompleted = await taskDal.uncomplete(task.id)
      expect(uncompleted.status).toBe('todo')
      expect(uncompleted.completedAt).toBeUndefined()
    })
  })

  describe('countByStatus', () => {
    it('should count todo and done tasks', async () => {
      await taskDal.create(createTaskInput({ status: 'todo' }))
      await taskDal.create(createTaskInput({ status: 'done' }))
      await taskDal.create(createTaskInput({ status: 'todo' }))
      const counts = await taskDal.countByStatus()
      expect(counts.todo).toBe(2)
      expect(counts.done).toBe(1)
    })
  })
})
