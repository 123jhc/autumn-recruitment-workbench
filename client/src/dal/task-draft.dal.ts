import { db } from '../db/database.js'
import { nanoid } from 'nanoid'
import type { Task, TaskDraft } from '@autumn-recruitment/shared'

export const taskDraftDal = {
  async getByImportId(importId: string): Promise<TaskDraft[]> {
    return db.taskDrafts.where('importId').equals(importId).toArray()
  },

  async getById(id: string): Promise<TaskDraft | undefined> {
    return db.taskDrafts.get(id)
  },

  async create(input: Omit<TaskDraft, 'id'>): Promise<TaskDraft> {
    const draft: TaskDraft = {
      ...input,
      id: nanoid(),
    }
    await db.taskDrafts.add(draft)
    return draft
  },

  async bulkCreate(items: Omit<TaskDraft, 'id'>[]): Promise<TaskDraft[]> {
    const drafts: TaskDraft[] = items.map((item) => ({
      ...item,
      id: nanoid(),
    }))
    await db.taskDrafts.bulkAdd(drafts)
    return drafts
  },

  async update(id: string, patch: Partial<Omit<TaskDraft, 'id' | 'importId'>>): Promise<TaskDraft> {
    const existing = await db.taskDrafts.get(id)
    if (existing == null) throw new Error(`TaskDraft not found: ${id}`)
    const updated: TaskDraft = {
      ...existing,
      ...patch,
      id: existing.id,
      importId: existing.importId,
    }
    await db.taskDrafts.put(updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    await db.taskDrafts.delete(id)
  },

  async deleteByImportId(importId: string): Promise<void> {
    const drafts = await db.taskDrafts.where('importId').equals(importId).toArray()
    const ids = drafts.map((d) => d.id)
    await db.taskDrafts.bulkDelete(ids)
  },

  async confirmDrafts(importId: string): Promise<Task[]> {
    return db.transaction('rw', [db.tasks, db.taskDrafts, db.planImports], async () => {
      const drafts = await db.taskDrafts.where('importId').equals(importId).toArray()
      if (drafts.length === 0) {
        throw new Error(`No drafts found for importId: ${importId}`)
      }

      const now = new Date().toISOString()
      const tasks: Task[] = drafts.map((draft) => ({
        id: nanoid(),
        title: draft.title,
        category: draft.category,
        plannedDate: draft.plannedDate,
        dueDate: draft.dueDate,
        priority: draft.priority,
        estimatedMinutes: draft.estimatedMinutes,
        status: 'todo' as const,
        notes: draft.rationale,
        source: 'plan' as const,
        sourceId: importId,
        createdAt: now,
        updatedAt: now,
      }))

      await db.tasks.bulkAdd(tasks)

      const draftIds = drafts.map((d) => d.id)
      await db.taskDrafts.bulkDelete(draftIds)

      const planImport = await db.planImports.get(importId)
      if (planImport != null) {
        await db.planImports.update(importId, {
          status: 'confirmed',
          confirmedAt: now,
        })
      }

      return tasks
    })
  },
}
