import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react'
import { backupDal } from '../dal/backup.dal'
import { getAiStatus } from '../services/api-client'
import type { BackupEnvelope } from '@autumn-recruitment/shared'
import { BackupEnvelopeSchema } from '@autumn-recruitment/shared'

// -- State type --
interface SettingsState {
  aiConfigured: boolean
  aiModel: string | null
  loading: boolean
  error: string | null
}

// -- Actions --
type SettingsAction =
  | { type: 'SET_AI_STATUS'; payload: { configured: boolean; model: string | null } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }

// -- Initial state --
const initialState: SettingsState = {
  aiConfigured: false,
  aiModel: null,
  loading: false,
  error: null,
}

// -- Reducer --
function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_AI_STATUS':
      return { ...state, aiConfigured: action.payload.configured, aiModel: action.payload.model, loading: false }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    default:
      return state
  }
}

// -- Context value type --
interface SettingsContextValue {
  state: SettingsState
  checkAiStatus: () => Promise<void>
  exportBackup: () => Promise<void>
  importBackup: (file: File) => Promise<BackupEnvelope>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

// -- Provider --
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(settingsReducer, initialState)

  const checkAiStatus = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const status = await getAiStatus()
      dispatch({
        type: 'SET_AI_STATUS',
        payload: { configured: status.configured, model: status.model ?? null },
      })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Failed to check AI status',
      })
    }
  }, [])

  // Check AI status on mount
  useEffect(() => {
    checkAiStatus()
  }, [checkAiStatus])

  const exportBackup = useCallback(async () => {
    const envelope = await backupDal.exportAll()
    const json = JSON.stringify(envelope, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `autumn-recruitment-backup-${envelope.exportedAt.slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const importBackup = useCallback(async (file: File): Promise<BackupEnvelope> => {
    const text = await file.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error('无效的 JSON 文件')
    }

    // Validate schema
    const result = BackupEnvelopeSchema.safeParse(parsed)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join('; ')
      throw new Error(`备份文件格式无效: ${messages}`)
    }

    const envelope = result.data

    // Show summary before importing
    const { tasks, taskDrafts, planImports, applications, leetCodeProblems } = envelope.data
    const summary = [
      `任务: ${tasks.length}`,
      `任务草稿: ${taskDrafts.length}`,
      `计划导入: ${planImports.length}`,
      `岗位投递: ${applications.length}`,
      `LeetCode 题目: ${leetCodeProblems.length}`,
    ].join(', ')

    // Confirm import
    const confirmed = window.confirm(
      `确认导入备份？当前数据将被替换。\n\n备份摘要:\n${summary}\n\n导出时间: ${envelope.exportedAt}\n版本: ${envelope.schemaVersion}`,
    )
    if (!confirmed) {
      throw new Error('用户取消导入')
    }

    await backupDal.importBackup(envelope)
    return envelope
  }, [])

  return (
    <SettingsContext.Provider
      value={{
        state,
        checkAiStatus,
        exportBackup,
        importBackup,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

// -- Hook --
export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (ctx == null) {
    throw new Error('useSettingsContext must be used within a SettingsProvider')
  }
  return ctx
}
