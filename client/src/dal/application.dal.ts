import { db } from '../db/database.js'
import { nanoid } from 'nanoid'
import type { Application, ApplicationStatus } from '@autumn-recruitment/shared'

export const applicationDal = {
  async getAll(): Promise<Application[]> {
    return db.applications.toArray()
  },

  async getById(id: string): Promise<Application | undefined> {
    return db.applications.get(id)
  },

  async getByStatus(status: ApplicationStatus): Promise<Application[]> {
    return db.applications.where('status').equals(status).toArray()
  },

  async getNextActions(today: string): Promise<Application[]> {
    const weekLater = new Date(today)
    weekLater.setDate(weekLater.getDate() + 7)
    const weekLaterStr = weekLater.toISOString().slice(0, 10)

    return db.applications
      .filter((a) => a.nextActionDate != null && a.nextActionDate >= today && a.nextActionDate <= weekLaterStr)
      .toArray()
  },

  async search(query: string): Promise<Application[]> {
    const lower = query.toLowerCase()
    return db.applications
      .filter((a) => a.company.toLowerCase().includes(lower) || a.role.toLowerCase().includes(lower))
      .toArray()
  },

  async countByStatus(): Promise<Record<ApplicationStatus, number>> {
    const all = await db.applications.toArray()
    const counts = {} as Record<ApplicationStatus, number>
    for (const a of all) {
      counts[a.status] = (counts[a.status] || 0) + 1
    }
    return counts
  },

  async create(input: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Promise<Application> {
    const now = new Date().toISOString()
    const record: Application = {
      ...input,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    }
    await db.applications.add(record)
    return record
  },

  async update(id: string, patch: Partial<Omit<Application, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Application> {
    const existing = await db.applications.get(id)
    if (existing == null) throw new Error(`Application not found: ${id}`)
    const updated: Application = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }
    await db.applications.put(updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    await db.applications.delete(id)
  },
}
