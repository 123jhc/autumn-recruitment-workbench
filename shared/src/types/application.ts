export type ApplicationStatus = 'target' | 'preparing' | 'applied' | 'assessment' | 'interview' | 'offer' | 'rejected'

export interface Application {
  id: string
  company: string
  role: string
  location?: string
  url?: string
  requirements?: string
  status: ApplicationStatus
  appliedDate?: string
  nextAction?: string
  nextActionDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}
