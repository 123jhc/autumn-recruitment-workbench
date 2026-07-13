import Dexie, { type EntityTable } from 'dexie'
import type { Task, TaskDraft, PlanImport, Application, LeetCodeProblem } from '@autumn-recruitment/shared'

export class AppDatabase extends Dexie {
  tasks!: EntityTable<Task, 'id'>
  taskDrafts!: EntityTable<TaskDraft, 'id'>
  planImports!: EntityTable<PlanImport, 'id'>
  applications!: EntityTable<Application, 'id'>
  leetCodeProblems!: EntityTable<LeetCodeProblem, 'id'>

  constructor() {
    super('AutumnRecruitmentDB')

    this.version(1).stores({
      tasks: 'id, category, status, source, sourceId, plannedDate, dueDate, createdAt',
      taskDrafts: 'id, importId',
      planImports: 'id, status, createdAt',
      applications: 'id, company, role, status, nextActionDate, createdAt',
      leetCodeProblems: 'id, number, difficulty, status, reviewDate, solvedDate, createdAt',
    })
  }
}

export const db = new AppDatabase()
