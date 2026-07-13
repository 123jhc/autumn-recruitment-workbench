import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react'
import { leetCodeDal } from '../dal/leetcode.dal'
import type { LeetCodeProblem, Difficulty, ProblemStatus } from '@autumn-recruitment/shared'
import { todayShanghai, weekRangeShanghai } from '../hooks/use-date-utils'

// -- State type --
interface LeetCodeState {
  problems: LeetCodeProblem[]
  loading: boolean
  error: string | null
  filters: { difficulty?: Difficulty; tag?: string; status?: ProblemStatus }
}

// -- Actions --
type LeetCodeAction =
  | { type: 'SET_PROBLEMS'; payload: LeetCodeProblem[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: Partial<LeetCodeState['filters']> }
  | { type: 'ADD_PROBLEM'; payload: LeetCodeProblem }
  | { type: 'UPDATE_PROBLEM'; payload: LeetCodeProblem }
  | { type: 'REMOVE_PROBLEM'; payload: string }

// -- Initial state --
const initialState: LeetCodeState = {
  problems: [],
  loading: true,
  error: null,
  filters: {},
}

// -- Reducer --
function leetCodeReducer(state: LeetCodeState, action: LeetCodeAction): LeetCodeState {
  switch (action.type) {
    case 'SET_PROBLEMS':
      return { ...state, problems: action.payload, loading: false }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } }
    case 'ADD_PROBLEM':
      return { ...state, problems: [action.payload, ...state.problems] }
    case 'UPDATE_PROBLEM':
      return {
        ...state,
        problems: state.problems.map((p) => (p.id === action.payload.id ? action.payload : p)),
      }
    case 'REMOVE_PROBLEM':
      return {
        ...state,
        problems: state.problems.filter((p) => p.id !== action.payload),
      }
    default:
      return state
  }
}

// -- Context value type --
interface LeetCodeContextValue {
  state: LeetCodeState
  loadProblems: () => Promise<void>
  createProblem: (input: Omit<LeetCodeProblem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<LeetCodeProblem>
  updateProblem: (id: string, patch: Partial<Omit<LeetCodeProblem, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<LeetCodeProblem>
  deleteProblem: (id: string) => Promise<void>
  completeReview: (id: string, newReviewDate?: string) => Promise<LeetCodeProblem>
  getReviewDue: (today: string) => LeetCodeProblem[]
  getSolvedThisWeek: (weekStart: string, weekEnd: string) => LeetCodeProblem[]
  setFilters: (filters: Partial<LeetCodeState['filters']>) => void
}

const LeetCodeContext = createContext<LeetCodeContextValue | null>(null)

// -- Provider --
export function LeetCodeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(leetCodeReducer, initialState)

  const loadProblems = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      let problems: LeetCodeProblem[]

      if (state.filters.difficulty) {
        problems = await leetCodeDal.getByDifficulty(state.filters.difficulty)
      } else if (state.filters.status) {
        problems = await leetCodeDal.getByStatus(state.filters.status)
      } else {
        problems = await leetCodeDal.getAll()
      }

      // Apply client-side tag filter if set
      if (state.filters.tag) {
        const tag = state.filters.tag.toLowerCase()
        problems = problems.filter((p) => p.tags.some((t) => t.toLowerCase().includes(tag)))
      }

      dispatch({ type: 'SET_PROBLEMS', payload: problems })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Failed to load LeetCode problems',
      })
    }
  }, [state.filters])

  // Load on mount and when filters change
  useEffect(() => {
    loadProblems()
  }, [loadProblems])

  const createProblem = useCallback(
    async (input: Omit<LeetCodeProblem, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeetCodeProblem> => {
      const problem = await leetCodeDal.create(input)
      dispatch({ type: 'ADD_PROBLEM', payload: problem })
      return problem
    },
    [],
  )

  const updateProblem = useCallback(
    async (
      id: string,
      patch: Partial<Omit<LeetCodeProblem, 'id' | 'createdAt' | 'updatedAt'>>,
    ): Promise<LeetCodeProblem> => {
      const current = state.problems.find((p) => p.id === id)
      if (current == null) throw new Error(`LeetCodeProblem not found: ${id}`)

      // Optimistic update
      const optimistic: LeetCodeProblem = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      }
      dispatch({ type: 'UPDATE_PROBLEM', payload: optimistic })

      try {
        const updated = await leetCodeDal.update(id, patch)
        dispatch({ type: 'UPDATE_PROBLEM', payload: updated })
        return updated
      } catch (err) {
        // Revert on error
        dispatch({ type: 'UPDATE_PROBLEM', payload: current })
        throw err
      }
    },
    [state.problems],
  )

  const deleteProblem = useCallback(
    async (id: string): Promise<void> => {
      const current = state.problems.find((p) => p.id === id)
      dispatch({ type: 'REMOVE_PROBLEM', payload: id })
      try {
        await leetCodeDal.delete(id)
      } catch (err) {
        // Revert on error
        if (current) {
          dispatch({ type: 'ADD_PROBLEM', payload: current })
        }
        throw err
      }
    },
    [state.problems],
  )

  const completeReview = useCallback(
    async (id: string, newReviewDate?: string): Promise<LeetCodeProblem> => {
      const current = state.problems.find((p) => p.id === id)
      if (current == null) throw new Error(`LeetCodeProblem not found: ${id}`)

      const now = new Date().toISOString()
      const patch: Partial<Omit<LeetCodeProblem, 'id' | 'createdAt' | 'updatedAt'>> = {
        lastReviewedAt: now,
      }

      if (newReviewDate) {
        patch.reviewDate = newReviewDate
        patch.status = 'review'
      } else {
        patch.status = 'solved'
        patch.reviewDate = undefined
      }

      const optimistic: LeetCodeProblem = {
        ...current,
        ...patch,
        updatedAt: now,
      }
      dispatch({ type: 'UPDATE_PROBLEM', payload: optimistic })

      try {
        const updated = await leetCodeDal.update(id, patch)
        dispatch({ type: 'UPDATE_PROBLEM', payload: updated })
        return updated
      } catch (err) {
        // Revert on error
        dispatch({ type: 'UPDATE_PROBLEM', payload: current })
        throw err
      }
    },
    [state.problems],
  )

  const getReviewDue = useCallback(
    (today: string): LeetCodeProblem[] => {
      return state.problems.filter(
        (p) => p.status === 'review' && p.reviewDate != null && p.reviewDate <= today,
      )
    },
    [state.problems],
  )

  const getSolvedThisWeek = useCallback(
    (weekStart: string, weekEnd: string): LeetCodeProblem[] => {
      return state.problems.filter(
        (p) =>
          p.status === 'solved' &&
          p.solvedDate != null &&
          p.solvedDate >= weekStart &&
          p.solvedDate <= weekEnd,
      )
    },
    [state.problems],
  )

  const setFilters = useCallback((filters: Partial<LeetCodeState['filters']>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters })
  }, [])

  return (
    <LeetCodeContext.Provider
      value={{
        state,
        loadProblems,
        createProblem,
        updateProblem,
        deleteProblem,
        completeReview,
        getReviewDue,
        getSolvedThisWeek,
        setFilters,
      }}
    >
      {children}
    </LeetCodeContext.Provider>
  )
}

// -- Hook --
export function useLeetCodeContext(): LeetCodeContextValue {
  const ctx = useContext(LeetCodeContext)
  if (ctx == null) {
    throw new Error('useLeetCodeContext must be used within a LeetCodeProvider')
  }
  return ctx
}
