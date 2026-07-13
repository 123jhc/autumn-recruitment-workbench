import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react'
import { taskDal } from '../dal/task.dal'
import type { Task, TaskCategory, TaskStatus } from '@autumn-recruitment/shared'
import { todayShanghai, weekRangeShanghai } from '../hooks/use-date-utils'

// -- State type --
interface TaskState {
  tasks: Task[]
  loading: boolean
  error: string | null
  filter: { category?: TaskCategory; status?: TaskStatus; source?: string }
  view: 'today' | 'week' | 'all' | 'completed'
}

// -- Actions --
type TaskAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTER'; payload: Partial<TaskState['filter']> }
  | { type: 'SET_VIEW'; payload: TaskState['view'] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'REMOVE_TASK'; payload: string }
  | { type: 'ADD_TASKS'; payload: Task[] }

// -- Initial state --
const initialState: TaskState = {
  tasks: [],
  loading: true,
  error: null,
  filter: {},
  view: 'today',
}

// -- Reducer --
function taskReducer(state: TaskState, action: TaskAction): TaskState {
  switch (action.type) {
    case 'SET_TASKS':
      return { ...state, tasks: action.payload, loading: false }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'SET_FILTER':
      return { ...state, filter: { ...state.filter, ...action.payload } }
    case 'SET_VIEW':
      return { ...state, view: action.payload }
    case 'ADD_TASK':
      return { ...state, tasks: [action.payload, ...state.tasks] }
    case 'ADD_TASKS':
      return { ...state, tasks: [...action.payload, ...state.tasks] }
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.payload.id ? action.payload : t)),
      }
    case 'REMOVE_TASK':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.payload) }
    default:
      return state
  }
}

// -- Context value type --
interface TaskContextValue {
  state: TaskState
  loadTasks: () => Promise<void>
  createTask: (input: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>
  updateTask: (id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>) => Promise<Task>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string) => Promise<Task>
  uncompleteTask: (id: string) => Promise<Task>
  setFilter: (filter: Partial<TaskState['filter']>) => void
  setView: (view: TaskState['view']) => void
  addTasks: (tasks: Task[]) => void
}

const TaskContext = createContext<TaskContextValue | null>(null)

// -- Provider --
export function TaskProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(taskReducer, initialState)

  const loadTasks = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      let tasks: Task[]
      const today = todayShanghai()

      switch (state.view) {
        case 'all':
          tasks = await taskDal.getAll()
          break
        case 'completed':
          tasks = (await taskDal.getAll()).filter((t) => t.status === 'done')
          break
        case 'today':
          tasks = await taskDal.getTodayTasks(today)
          break
        case 'week': {
          const { start, end } = weekRangeShanghai(today)
          tasks = await taskDal.getWeekTasks(start, end)
          break
        }
        default:
          tasks = await taskDal.getAll()
      }
      dispatch({ type: 'SET_TASKS', payload: tasks })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to load tasks' })
    }
  }, [state.view])

  // Load tasks on mount and when view changes
  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const createTask = useCallback(
    async (input: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
      const task = await taskDal.create(input)
      dispatch({ type: 'ADD_TASK', payload: task })
      return task
    },
    [],
  )

  const updateTask = useCallback(
    async (id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<Task> => {
      // Get current task for optimistic update
      const current = state.tasks.find((t) => t.id === id)
      if (current == null) throw new Error(`Task not found: ${id}`)

      // Optimistic update
      const optimistic: Task = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      }
      dispatch({ type: 'UPDATE_TASK', payload: optimistic })

      try {
        const updated = await taskDal.update(id, patch)
        // Apply the real result from DAL
        dispatch({ type: 'UPDATE_TASK', payload: updated })
        return updated
      } catch (err) {
        // Revert on error
        dispatch({ type: 'UPDATE_TASK', payload: current })
        throw err
      }
    },
    [state.tasks],
  )

  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      const current = state.tasks.find((t) => t.id === id)
      dispatch({ type: 'REMOVE_TASK', payload: id })
      try {
        await taskDal.delete(id)
      } catch (err) {
        // Revert on error
        if (current) {
          dispatch({ type: 'ADD_TASK', payload: current })
        }
        throw err
      }
    },
    [state.tasks],
  )

  const completeTask = useCallback(
    async (id: string): Promise<Task> => {
      const current = state.tasks.find((t) => t.id === id)
      if (current == null) throw new Error(`Task not found: ${id}`)

      const now = new Date().toISOString()
      const optimistic: Task = {
        ...current,
        status: 'done' as TaskStatus,
        completedAt: now,
        updatedAt: now,
      }
      dispatch({ type: 'UPDATE_TASK', payload: optimistic })

      try {
        const updated = await taskDal.complete(id)
        dispatch({ type: 'UPDATE_TASK', payload: updated })
        return updated
      } catch (err) {
        dispatch({ type: 'UPDATE_TASK', payload: current })
        throw err
      }
    },
    [state.tasks],
  )

  const uncompleteTask = useCallback(
    async (id: string): Promise<Task> => {
      const current = state.tasks.find((t) => t.id === id)
      if (current == null) throw new Error(`Task not found: ${id}`)

      const optimistic: Task = {
        ...current,
        status: 'todo' as TaskStatus,
        completedAt: undefined,
        updatedAt: new Date().toISOString(),
      }
      dispatch({ type: 'UPDATE_TASK', payload: optimistic })

      try {
        const updated = await taskDal.uncomplete(id)
        dispatch({ type: 'UPDATE_TASK', payload: updated })
        return updated
      } catch (err) {
        dispatch({ type: 'UPDATE_TASK', payload: current })
        throw err
      }
    },
    [state.tasks],
  )

  const setFilter = useCallback((filter: Partial<TaskState['filter']>) => {
    dispatch({ type: 'SET_FILTER', payload: filter })
  }, [])

  const setView = useCallback((view: TaskState['view']) => {
    dispatch({ type: 'SET_VIEW', payload: view })
  }, [])

  const addTasks = useCallback((tasks: Task[]) => {
    dispatch({ type: 'ADD_TASKS', payload: tasks })
  }, [])

  return (
    <TaskContext.Provider
      value={{
        state,
        loadTasks,
        createTask,
        updateTask,
        deleteTask,
        completeTask,
        uncompleteTask,
        setFilter,
        setView,
        addTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  )
}

// -- Hook --
export function useTaskContext(): TaskContextValue {
  const ctx = useContext(TaskContext)
  if (ctx == null) {
    throw new Error('useTaskContext must be used within a TaskProvider')
  }
  return ctx
}
