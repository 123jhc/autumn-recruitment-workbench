import { db } from '../db/database.js'
import { nanoid } from 'nanoid'
import type { PlanImport } from '@autumn-recruitment/shared'

export const planImportDal = {
  async getAll(): Promise<PlanImport[]> {
    return db.planImports.toArray()
  },

  async getById(id: string): Promise<PlanImport | undefined> {
    return db.planImports.get(id)
  },

  async create(input: Omit<PlanImport, 'id' | 'createdAt'>): Promise<PlanImport> {
    const now = new Date().toISOString()
    const record: PlanImport = {
      ...input,
      id: nanoid(),
      createdAt: now,
    }
    await db.planImports.add(record)
    return record
  },

  async update(id: string, patch: Partial<Omit<PlanImport, 'id' | 'createdAt'>>): Promise<PlanImport> {
    const existing = await db.planImports.get(id)
    if (existing == null) throw new Error(`PlanImport not found: ${id}`)
    const updated: PlanImport = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
    }
    await db.planImports.put(updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    await db.planImports.delete(id)
  },
}
