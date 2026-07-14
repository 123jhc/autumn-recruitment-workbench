import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react'
import { backupDal } from '../dal/backup.dal'
import {
  getAiConfigs,
  createAiConfig,
  updateAiConfig,
  deleteAiConfig,
  setActiveAiConfig,
  testAiConfig,
} from '../services/api-client'
import type {
  BackupEnvelope,
  AiConfigView,
  AiConfigRequest,
  AiConfigsResponse,
  AiConfigTestResponse,
} from '@autumn-recruitment/shared'
import { BackupEnvelopeSchema } from '@autumn-recruitment/shared'

// -- State type --
interface SettingsState {
  aiConfigs: AiConfigView[]
  activeId: string | null
  loading: boolean
  error: string | null
}

// -- Actions --
type SettingsAction =
  | { type: 'SET_CONFIGS'; payload: AiConfigsResponse }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_CONFIG'; payload: AiConfigView }
  | { type: 'REMOVE_CONFIG'; payload: string }
  | { type: 'SET_ACTIVE'; payload: string }
  | { type: 'SET_AVAILABILITY'; payload: { id: string; available: boolean | null } }

// -- Initial state --
const initialState: SettingsState = {
  aiConfigs: [],
  activeId: null,
  loading: false,
  error: null,
}

// -- Reducer --
function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_CONFIGS':
      return {
        ...state,
        aiConfigs: action.payload.configs,
        activeId: action.payload.activeId,
        loading: false,
        error: null,
      }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'UPDATE_CONFIG':
      return {
        ...state,
        aiConfigs: state.aiConfigs.map((c) => (c.id === action.payload.id ? action.payload : c)),
        loading: false,
        error: null,
      }
    case 'REMOVE_CONFIG':
      return {
        ...state,
        aiConfigs: state.aiConfigs.filter((c) => c.id !== action.payload),
        activeId: state.activeId === action.payload ? null : state.activeId,
        loading: false,
        error: null,
      }
    case 'SET_ACTIVE':
      return { ...state, activeId: action.payload }
    case 'SET_AVAILABILITY':
      return {
        ...state,
        aiConfigs: state.aiConfigs.map((c) =>
          c.id === action.payload.id ? { ...c, available: action.payload.available } : c,
        ),
      }
    default:
      return state
  }
}

// -- Context value type --
interface SettingsContextValue {
  state: SettingsState
  loadConfigs: () => Promise<void>
  createConfig: (data: AiConfigRequest) => Promise<void>
  updateConfig: (id: string, data: AiConfigRequest) => Promise<void>
  deleteConfig: (id: string) => Promise<void>
  setActive: (id: string) => Promise<void>
  testConfig: (id: string) => Promise<AiConfigTestResponse>
  exportBackup: () => Promise<void>
  importBackup: (file: File) => Promise<BackupEnvelope>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

// -- Provider --
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(settingsReducer, initialState)

  const loadConfigs = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const data = await getAiConfigs()
      dispatch({ type: 'SET_CONFIGS', payload: data })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : '加载 AI 配置失败',
      })
    }
  }, [])

  const createConfig = useCallback(async (data: AiConfigRequest) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      await createAiConfig(data)
      const refreshed = await getAiConfigs()
      dispatch({ type: 'SET_CONFIGS', payload: refreshed })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : '创建配置失败',
      })
      throw err
    }
  }, [])

  const updateConfig = useCallback(async (id: string, data: AiConfigRequest) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      await updateAiConfig(id, data)
      const refreshed = await getAiConfigs()
      dispatch({ type: 'SET_CONFIGS', payload: refreshed })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : '更新配置失败',
      })
      throw err
    }
  }, [])

  const deleteConfig = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      await deleteAiConfig(id)
      dispatch({ type: 'REMOVE_CONFIG', payload: id })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : '删除配置失败',
      })
      throw err
    }
  }, [])

  const setActive = useCallback(async (id: string) => {
    try {
      await setActiveAiConfig(id)
      dispatch({ type: 'SET_ACTIVE', payload: id })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : '设置激活配置失败',
      })
      throw err
    }
  }, [])

  const testConfig = useCallback(async (id: string): Promise<AiConfigTestResponse> => {
    // 测试不设全局 loading，由组件按 id 控制 loading
    try {
      const result = await testAiConfig(id)
      dispatch({ type: 'SET_AVAILABILITY', payload: { id, available: result.ok ? true : false } })
      return result
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : '连通测试失败',
      })
      return { ok: false, message: err instanceof Error ? err.message : '连通测试失败' }
    }
  }, [])

  // Load configs on mount
  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

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

    const result = BackupEnvelopeSchema.safeParse(parsed)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join('; ')
      throw new Error(`备份文件格式无效: ${messages}`)
    }

    const envelope = result.data
    const { tasks, taskDrafts, planImports, applications } = envelope.data
    const leetCodeCount = envelope.schemaVersion === 1
      ? envelope.data.leetCodeProblems.length
      : envelope.data.leetCodeCatalog.length
    const summary = [
      `任务: ${tasks.length}`,
      `任务草稿: ${taskDrafts.length}`,
      `计划导入: ${planImports.length}`,
      `岗位投递: ${applications.length}`,
      `LeetCode 题目: ${leetCodeCount}`,
    ].join(', ')

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
        loadConfigs,
        createConfig,
        updateConfig,
        deleteConfig,
        setActive,
        testConfig,
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
