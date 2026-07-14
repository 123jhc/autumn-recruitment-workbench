import { createContext, useContext, useReducer, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { leetCodeDal, type LeetCodeProblemInput, type ScheduleConfigInput } from '../dal/leetcode.dal'
import type { LeetCodeProblem, LeetCodeSchedule, Difficulty, ProblemStatus } from '@autumn-recruitment/shared'
import { filterProblemRows } from '../features/leetcode/planning'

export interface LeetCodeFilters {
  difficulty?: Difficulty
  tag?: string
  status?: ProblemStatus
  topic?: string
}

interface LeetCodeState {
  problems: LeetCodeProblem[]
  schedule?: LeetCodeSchedule
  loading: boolean
  error: string | null
  filters: LeetCodeFilters
}

type LeetCodeAction =
  | { type: 'SET_DATA'; payload: { problems: LeetCodeProblem[]; schedule?: LeetCodeSchedule } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: LeetCodeFilters }

const initialState: LeetCodeState = { problems: [], loading: true, error: null, filters: {} }

function leetCodeReducer(state: LeetCodeState, action: LeetCodeAction): LeetCodeState {
  switch (action.type) {
    case 'SET_DATA': return { ...state, ...action.payload, loading: false, error: null }
    case 'SET_LOADING': return { ...state, loading: action.payload }
    case 'SET_ERROR': return { ...state, error: action.payload, loading: false }
    case 'SET_FILTERS': return { ...state, filters: action.payload }
    default: return state
  }
}

interface LeetCodeContextValue {
  state: LeetCodeState
  filteredProblems: LeetCodeProblem[]
  loadProblems: () => Promise<void>
  initializeHot100: (config: ScheduleConfigInput) => Promise<{ added: number; matched: number; total: number }>
  reschedule: (config: ScheduleConfigInput) => Promise<void>
  moveProblem: (slug: string, direction: -1 | 1, today: string) => Promise<void>
  createProblem: (input: LeetCodeProblemInput) => Promise<LeetCodeProblem>
  updateProblem: (slug: string, patch: Partial<LeetCodeProblemInput>) => Promise<LeetCodeProblem>
  deleteProblem: (slug: string) => Promise<void>
  completeProblem: (slug: string, solvedDate: string) => Promise<LeetCodeProblem>
  completeReview: (slug: string, newReviewDate?: string) => Promise<LeetCodeProblem>
  getReviewDue: (today: string) => LeetCodeProblem[]
  getSolvedThisWeek: (weekStart: string, weekEnd: string) => LeetCodeProblem[]
  setFilters: (filters: LeetCodeFilters) => void
}

const LeetCodeContext = createContext<LeetCodeContextValue | null>(null)

export function LeetCodeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(leetCodeReducer, initialState)

  const loadProblems = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const [problems, schedule] = await Promise.all([leetCodeDal.getAll(), leetCodeDal.getSchedule()])
      dispatch({ type: 'SET_DATA', payload: { problems, schedule } })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '加载 LeetCode 题目失败' })
    }
  }, [])

  useEffect(() => { void loadProblems() }, [loadProblems])

  const refreshAfter = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    const result = await operation()
    await loadProblems()
    return result
  }, [loadProblems])

  const initializeHot100 = useCallback((config: ScheduleConfigInput) =>
    refreshAfter(() => leetCodeDal.initializeHot100(config)), [refreshAfter])
  const reschedule = useCallback((config: ScheduleConfigInput) =>
    refreshAfter(() => leetCodeDal.reschedule(config)), [refreshAfter])
  const moveProblem = useCallback((slug: string, direction: -1 | 1, today: string) =>
    refreshAfter(() => leetCodeDal.moveProblem(slug, direction, today)), [refreshAfter])
  const createProblem = useCallback((input: LeetCodeProblemInput) =>
    refreshAfter(() => leetCodeDal.create(input)), [refreshAfter])
  const updateProblem = useCallback((slug: string, patch: Partial<LeetCodeProblemInput>) =>
    refreshAfter(() => leetCodeDal.update(slug, patch)), [refreshAfter])
  const deleteProblem = useCallback((slug: string) =>
    refreshAfter(() => leetCodeDal.delete(slug)), [refreshAfter])
  const completeProblem = useCallback((slug: string, solvedDate: string) =>
    refreshAfter(() => leetCodeDal.complete(slug, solvedDate)), [refreshAfter])
  const completeReview = useCallback((slug: string, newReviewDate?: string) =>
    refreshAfter(() => leetCodeDal.completeReview(slug, newReviewDate)), [refreshAfter])

  const getReviewDue = useCallback((today: string) => state.problems.filter((problem) =>
    problem.reviewDate != null && problem.reviewDate <= today,
  ), [state.problems])
  const getSolvedThisWeek = useCallback((weekStart: string, weekEnd: string) => state.problems.filter((problem) =>
    problem.solvedDate != null && problem.solvedDate >= weekStart && problem.solvedDate <= weekEnd,
  ), [state.problems])
  const setFilters = useCallback((filters: LeetCodeFilters) => dispatch({ type: 'SET_FILTERS', payload: filters }), [])

  const filteredProblems = useMemo(() => filterProblemRows(state.problems, state.filters), [state.problems, state.filters])

  return (
    <LeetCodeContext.Provider value={{
      state, filteredProblems, loadProblems, initializeHot100, reschedule, moveProblem,
      createProblem, updateProblem, deleteProblem, completeProblem, completeReview,
      getReviewDue, getSolvedThisWeek, setFilters,
    }}>
      {children}
    </LeetCodeContext.Provider>
  )
}

export function useLeetCodeContext(): LeetCodeContextValue {
  const context = useContext(LeetCodeContext)
  if (!context) throw new Error('useLeetCodeContext must be used within a LeetCodeProvider')
  return context
}
