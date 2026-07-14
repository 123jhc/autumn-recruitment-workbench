import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { LeetCodeProblem, LeetCodeSchedule } from '@autumn-recruitment/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LeetCodePage from './LeetCodePage'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const context = vi.hoisted(() => ({
  state: {
    problems: [] as LeetCodeProblem[],
    schedule: undefined as LeetCodeSchedule | undefined,
    loading: false,
    error: null,
    filters: {},
  },
  filteredProblems: [] as LeetCodeProblem[],
  loadProblems: vi.fn(),
  initializeHot100: vi.fn(),
  reschedule: vi.fn(),
  moveProblem: vi.fn(),
  createProblem: vi.fn(),
  updateProblem: vi.fn(),
  deleteProblem: vi.fn(),
  completeProblem: vi.fn(),
  completeReview: vi.fn(),
  getReviewDue: vi.fn(),
  getSolvedThisWeek: vi.fn(),
  setFilters: vi.fn(),
}))

vi.mock('../../contexts', () => ({ useLeetCodeContext: () => context }))

const TODAY = '2026-07-14'

function makeProblem(overrides: Partial<LeetCodeProblem> = {}): LeetCodeProblem {
  return {
    id: 'problem-two-sum',
    slug: 'two-sum',
    number: 1,
    title: '两数之和',
    url: 'https://leetcode.cn/problems/two-sum/',
    difficulty: 'easy',
    tags: ['数组', '哈希表'],
    topic: '哈希',
    listId: 'leetcode-hot-100',
    status: 'todo',
    plannedDate: TODAY,
    queueOrder: 1,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function findButton(label: string): HTMLButtonElement {
  const button = Array.from(document.body.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  if (!button) throw new Error(`Button not found: ${label}`)
  return button
}

function findTopicSection(title: string): HTMLElement {
  const section = Array.from(document.body.querySelectorAll<HTMLElement>('section')).find(
    (candidate) => candidate.querySelector('h2')?.firstChild?.textContent?.trim() === title,
  )
  if (!section) throw new Error(`Topic section not found: ${title}`)
  return section
}

describe('LeetCodePage', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-13T16:30:00.000Z'))
    vi.clearAllMocks()
    context.state.problems = []
    context.state.schedule = undefined
    context.state.loading = false
    context.state.filters = {}
    context.filteredProblems = []
    context.initializeHot100.mockResolvedValue({ added: 100, matched: 0, total: 100 })
    context.reschedule.mockResolvedValue(undefined)
    context.completeProblem.mockResolvedValue(makeProblem({ status: 'solved', solvedDate: TODAY }))

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  async function renderPage() {
    await act(async () => root.render(<LeetCodePage />))
  }

  it('opens the Hot 100 initialization dialog from the empty state', async () => {
    await renderPage()

    expect(container.textContent).toContain('加载热题 100，按专题开始刷题')
    await act(async () => findButton('初始化热题 100').click())

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')
    expect(dialog?.getAttribute('aria-label')).toBe('初始化热题 100')
    expect(dialog?.textContent).toContain('每周刷题日')
  })

  it('offers Hot 100 initialization when custom problems exist without a schedule', async () => {
    const customProblem = makeProblem({
      id: 'custom-problem', slug: 'custom-problem', listId: undefined, topic: undefined, plannedDate: undefined,
    })
    context.state.problems = [customProblem]
    context.filteredProblems = [customProblem]

    await renderPage()

    await act(async () => findButton('初始化热题 100').click())
    expect(document.body.querySelector<HTMLElement>('[role="dialog"]')?.getAttribute('aria-label'))
      .toBe('初始化热题 100')
  })

  it('switches between today, all, and topic views and presents the matching problems', async () => {
    const todayProblem = makeProblem()
    const futureProblem = makeProblem({
      id: 'problem-linked-list-cycle',
      slug: 'linked-list-cycle',
      number: 141,
      title: '环形链表',
      topic: '链表',
      plannedDate: '2026-07-15',
      queueOrder: 2,
    })
    context.state.problems = [todayProblem, futureProblem]
    context.filteredProblems = [todayProblem, futureProblem]
    await renderPage()

    const todayTab = findButton('今日计划')
    const allTab = findButton('全部题目')
    const topicsTab = findButton('按专题')
    expect(todayTab.getAttribute('role')).toBe('tab')
    expect(todayTab.getAttribute('aria-selected')).toBe('true')
    expect(container.textContent).toContain('两数之和')
    expect(container.textContent).not.toContain('环形链表')

    await act(async () => allTab.click())
    expect(allTab.getAttribute('aria-selected')).toBe('true')
    expect(container.textContent).toContain('两数之和')
    expect(container.textContent).toContain('环形链表')

    await act(async () => topicsTab.click())
    expect(topicsTab.getAttribute('aria-selected')).toBe('true')
    const hashSection = findTopicSection('哈希')
    const linkedListSection = findTopicSection('链表')
    expect(hashSection.querySelector('h2')?.firstChild?.textContent).toBe('哈希')
    expect(hashSection.querySelector('h2 span')?.textContent).toBe('1 题')
    expect(linkedListSection.querySelector('h2')?.firstChild?.textContent).toBe('链表')
    expect(linkedListSection.querySelector('h2 span')?.textContent).toBe('1 题')
  })

  it('keeps a completed problem in today view when its planned date is today', async () => {
    const completedToday = makeProblem({
      status: 'solved', solvedDate: TODAY, plannedDate: TODAY,
    })
    context.state.problems = [completedToday]
    context.filteredProblems = [completedToday]

    await renderPage()

    expect(findButton('今日计划').getAttribute('aria-selected')).toBe('true')
    expect(container.textContent).toContain('两数之和')
    expect(container.textContent).toContain('已完成')
  })

  it('shows an unscheduled custom problem in all view and groups it under other problems', async () => {
    const customProblem = makeProblem({
      id: 'custom-problem', slug: 'custom-problem', number: undefined, title: '自定义题',
      topic: undefined, listId: undefined, plannedDate: undefined,
    })
    context.state.problems = [customProblem]
    context.filteredProblems = [customProblem]
    await renderPage()

    expect(container.textContent).not.toContain('自定义题')

    await act(async () => findButton('全部题目').click())
    expect(container.textContent).toContain('自定义题')

    await act(async () => findButton('按专题').click())
    const otherSection = findTopicSection('其他题目')
    expect(otherSection.querySelector('h2')?.firstChild?.textContent).toBe('其他题目')
    expect(otherSection.querySelector('h2 span')?.textContent).toBe('1 题')
    expect(container.textContent).toContain('自定义题')
  })

  it('completes a problem with its slug and the current Shanghai date', async () => {
    const problem = makeProblem()
    context.state.problems = [problem]
    context.filteredProblems = [problem]
    await renderPage()

    await act(async () => findButton('完成').click())

    expect(context.completeProblem).toHaveBeenCalledOnce()
    expect(context.completeProblem).toHaveBeenCalledWith('two-sum', TODAY)
  })

  it('opens the reschedule dialog when a schedule already exists', async () => {
    const problem = makeProblem()
    context.state.problems = [problem]
    context.filteredProblems = [problem]
    context.state.schedule = {
      id: 'schedule-hot-100',
      listId: 'leetcode-hot-100',
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      weekdays: [1, 2, 3, 4, 5],
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    }
    await renderPage()

    await act(async () => findButton('重新排期').click())

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')
    expect(dialog?.getAttribute('aria-label')).toBe('重新排期未完成题目')
    expect(dialog?.textContent).toContain('每周刷题日')
  })

  it('shows and applies clear filters when only a topic is selected', async () => {
    const problem = makeProblem()
    context.state.problems = [problem]
    context.state.filters = { topic: '哈希' }
    context.filteredProblems = [problem]
    await renderPage()

    await act(async () => findButton('清除筛选').click())

    expect(context.setFilters).toHaveBeenCalledWith({})
  })
})
