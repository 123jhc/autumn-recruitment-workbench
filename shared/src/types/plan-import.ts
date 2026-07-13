export interface PlanImport {
  id: string
  sourceType: 'file' | 'paste'
  fileName?: string
  fileFormat?: 'markdown' | 'text' | 'docx' | 'pdf'
  rawContent: string
  planningHorizon: 'today' | 'week' | 'season'
  status: 'draft' | 'confirmed' | 'failed'
  createdAt: string
  confirmedAt?: string
}
