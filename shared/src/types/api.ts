export interface ExtractResponse {
  fileName: string
  fileFormat: 'markdown' | 'text' | 'docx' | 'pdf'
  content: string
}

export interface ParsePlanRequest {
  content: string
  planningHorizon: 'today' | 'week' | 'season'
  today: string
  timezone: string
}

export interface AiTaskItem {
  title: string
  category: string
  plannedDate?: string
  dueDate?: string
  priority: string
  estimatedMinutes?: number
  rationale?: string
}

export interface ParsePlanResponse {
  tasks: AiTaskItem[]
}

export interface AiStatusResponse {
  configured: boolean
  model?: string
}
