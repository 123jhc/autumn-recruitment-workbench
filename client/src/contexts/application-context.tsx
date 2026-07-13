import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react'
import { applicationDal } from '../dal/application.dal'
import { taskDal } from '../dal/task.dal'
import type { Application, ApplicationStatus } from '@autumn-recruitment/shared'
import { todayShanghai } from '../hooks/use-date-utils'

// -- State type --
interface ApplicationState {
  applications: Application[]
  loading: boolean
  error: string | null
  filterStatus: ApplicationStatus | null
  searchQuery: string
}

// -- Actions --
type ApplicationAction =
  | { type: 'SET_APPLICATIONS'; payload: Application[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTER_STATUS'; payload: ApplicationStatus | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'ADD_APPLICATION'; payload: Application }
  | { type: 'UPDATE_APPLICATION'; payload: Application }
  | { type: 'REMOVE_APPLICATION'; payload: string }

// -- Initial state --
const initialState: ApplicationState = {
  applications: [],
  loading: true,
  error: null,
  filterStatus: null,
  searchQuery: '',
}

// -- Reducer --
function applicationReducer(state: ApplicationState, action: ApplicationAction): ApplicationState {
  switch (action.type) {
    case 'SET_APPLICATIONS':
      return { ...state, applications: action.payload, loading: false }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'SET_FILTER_STATUS':
      return { ...state, filterStatus: action.payload }
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }
    case 'ADD_APPLICATION':
      return { ...state, applications: [action.payload, ...state.applications] }
    case 'UPDATE_APPLICATION':
      return {
        ...state,
        applications: state.applications.map((a) =>
          a.id === action.payload.id ? action.payload : a,
        ),
      }
    case 'REMOVE_APPLICATION':
      return {
        ...state,
        applications: state.applications.filter((a) => a.id !== action.payload),
      }
    default:
      return state
  }
}

// -- Context value type --
interface ApplicationContextValue {
  state: ApplicationState
  loadApplications: () => Promise<void>
  createApplication: (input: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Application>
  updateApplication: (id: string, patch: Partial<Omit<Application, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<Application>
  deleteApplication: (id: string) => Promise<void>
  createNextActionTask: (appId: string) => Promise<import('@autumn-recruitment/shared').Task>
  countByStatus: () => Record<string, number>
  setFilterStatus: (status: ApplicationStatus | null) => void
  setSearchQuery: (query: string) => void
}

const ApplicationContext = createContext<ApplicationContextValue | null>(null)

// -- Provider --
export function ApplicationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(applicationReducer, initialState)

  const loadApplications = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      let apps: Application[]

      if (state.searchQuery) {
        apps = await applicationDal.search(state.searchQuery)
      } else if (state.filterStatus) {
        apps = await applicationDal.getByStatus(state.filterStatus)
      } else {
        apps = await applicationDal.getAll()
      }
      dispatch({ type: 'SET_APPLICATIONS', payload: apps })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Failed to load applications',
      })
    }
  }, [state.filterStatus, state.searchQuery])

  // Load on mount and when filters change
  useEffect(() => {
    loadApplications()
  }, [loadApplications])

  const createApplication = useCallback(
    async (input: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Promise<Application> => {
      const app = await applicationDal.create(input)
      dispatch({ type: 'ADD_APPLICATION', payload: app })
      return app
    },
    [],
  )

  const updateApplication = useCallback(
    async (id: string, patch: Partial<Omit<Application, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Application> => {
      const current = state.applications.find((a) => a.id === id)
      if (current == null) throw new Error(`Application not found: ${id}`)

      // Optimistic update
      const optimistic: Application = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      }
      dispatch({ type: 'UPDATE_APPLICATION', payload: optimistic })

      try {
        const updated = await applicationDal.update(id, patch)
        dispatch({ type: 'UPDATE_APPLICATION', payload: updated })
        return updated
      } catch (err) {
        // Revert on error
        dispatch({ type: 'UPDATE_APPLICATION', payload: current })
        throw err
      }
    },
    [state.applications],
  )

  const deleteApplication = useCallback(
    async (id: string): Promise<void> => {
      const current = state.applications.find((a) => a.id === id)
      dispatch({ type: 'REMOVE_APPLICATION', payload: id })
      try {
        await applicationDal.delete(id)
      } catch (err) {
        // Revert on error
        if (current) {
          dispatch({ type: 'ADD_APPLICATION', payload: current })
        }
        throw err
      }
    },
    [state.applications],
  )

  const createNextActionTask = useCallback(
    async (appId: string): Promise<import('@autumn-recruitment/shared').Task> => {
      const app = await applicationDal.getById(appId)
      if (app == null) throw new Error(`Application not found: ${appId}`)
      if (!app.nextAction) throw new Error('Application has no next action')

      // Check for duplicate - same source and sourceId
      const existingTasks = await taskDal.getBySource('application', appId)
      const duplicate = existingTasks.find(
        (t) => t.title === app.nextAction && t.status === 'todo',
      )
      if (duplicate) {
        throw new Error('A task for this next action already exists')
      }

      const today = todayShanghai()
      const task = await taskDal.create({
        title: app.nextAction,
        category: 'application',
        plannedDate: app.nextActionDate ?? today,
        dueDate: app.nextActionDate ?? undefined,
        priority: 'medium',
        status: 'todo',
        source: 'application',
        sourceId: appId,
      })

      // Clear next action fields from the application
      const updatedApp = await applicationDal.update(appId, {
        nextAction: undefined,
        nextActionDate: undefined,
      })
      dispatch({ type: 'UPDATE_APPLICATION', payload: updatedApp })

      return task
    },
    [],
  )

  const countByStatus = useCallback((): Record<string, number> => {
    const counts: Record<string, number> = {}
    for (const a of state.applications) {
      counts[a.status] = (counts[a.status] || 0) + 1
    }
    return counts
  }, [state.applications])

  const setFilterStatus = useCallback((status: ApplicationStatus | null) => {
    dispatch({ type: 'SET_FILTER_STATUS', payload: status })
  }, [])

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query })
  }, [])

  return (
    <ApplicationContext.Provider
      value={{
        state,
        loadApplications,
        createApplication,
        updateApplication,
        deleteApplication,
        createNextActionTask,
        countByStatus,
        setFilterStatus,
        setSearchQuery,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  )
}

// -- Hook --
export function useApplicationContext(): ApplicationContextValue {
  const ctx = useContext(ApplicationContext)
  if (ctx == null) {
    throw new Error('useApplicationContext must be used within an ApplicationProvider')
  }
  return ctx
}
