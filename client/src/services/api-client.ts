import type {
  ExtractResponse,
  ParsePlanRequest,
  ParsePlanResponse,
  AiStatusResponse,
  AiConfigsResponse,
  AiConfigView,
  AiConfigRequest,
  AiConfigTestResponse,
} from '@autumn-recruitment/shared'

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || body.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function extractFile(file: File): Promise<ExtractResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/plan/extract`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function parsePlan(data: ParsePlanRequest): Promise<ParsePlanResponse> {
  return request<ParsePlanResponse>('/plan/parse', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getAiStatus(): Promise<AiStatusResponse> {
  return request<AiStatusResponse>('/ai/status')
}

export async function getAiConfigs(): Promise<AiConfigsResponse> {
  return request<AiConfigsResponse>('/ai/configs')
}

export async function createAiConfig(data: AiConfigRequest): Promise<AiConfigView> {
  return request<AiConfigView>('/ai/configs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAiConfig(id: string, data: AiConfigRequest): Promise<AiConfigView> {
  return request<AiConfigView>(`/ai/configs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteAiConfig(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/ai/configs/${id}`, { method: 'DELETE' })
}

export async function setActiveAiConfig(id: string): Promise<{ activeId: string }> {
  return request<{ activeId: string }>(`/ai/configs/${id}/active`, { method: 'PUT' })
}

export async function testAiConfig(id: string): Promise<AiConfigTestResponse> {
  return request<AiConfigTestResponse>(`/ai/configs/${id}/test`, { method: 'POST' })
}
