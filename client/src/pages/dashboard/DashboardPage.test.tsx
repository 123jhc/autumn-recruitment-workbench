import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from './DashboardPage'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../contexts', () => ({
  useTaskContext: () => ({
    state: {
      tasks: [],
      loading: false,
      view: 'all',
    },
    setView: vi.fn(),
    loadTasks: vi.fn().mockResolvedValue(undefined),
    completeTask: vi.fn().mockResolvedValue(undefined),
    uncompleteTask: vi.fn().mockResolvedValue(undefined),
    createTask: vi.fn().mockResolvedValue(undefined),
  }),
  useApplicationContext: () => ({
    state: {
      applications: [],
      loading: false,
    },
    loadApplications: vi.fn().mockResolvedValue(undefined),
    createNextActionTask: vi.fn().mockResolvedValue(undefined),
  }),
  useLeetCodeContext: () => ({
    state: {
      problems: [],
      loading: false,
    },
    getReviewDue: vi.fn().mockReturnValue([]),
    loadProblems: vi.fn().mockResolvedValue(undefined),
    completeReview: vi.fn().mockResolvedValue(undefined),
  }),
}))

function findSectionRoot(container: HTMLElement, title: string): HTMLElement {
  const heading = Array.from(container.querySelectorAll('h2')).find(
    (element) => element.textContent === title,
  )

  if (!heading?.parentElement?.parentElement) {
    throw new Error(`Section not found: ${title}`)
  }

  return heading.parentElement.parentElement
}

describe('DashboardPage layout', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>,
      )
    })
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('stacks all dashboard sections as siblings in display order', () => {
    const sectionTitles = [
      '今日任务',
      '逾期任务',
      '岗位下一步行动',
      'LeetCode 复习提醒',
    ]
    const sectionRoots = sectionTitles.map((title) => findSectionRoot(container, title))

    expect(new Set(sectionRoots.map((section) => section.parentElement)).size).toBe(1)
  })

  it('shows only one create-task entry in the empty dashboard', () => {
    const createButtons = Array.from(document.body.querySelectorAll('button')).filter(
      (button) => button.textContent?.trim() === '新建任务',
    )

    expect(createButtons).toHaveLength(1)
  })

  it('uses compact empty messages for auxiliary sections', () => {
    expect(container.textContent).toContain('很好，目前没有逾期任务')
    expect(container.textContent).toContain('未来 7 天没有待处理行动')
    expect(container.textContent).not.toContain('前往岗位投递页面，为目标岗位添加下一步行动')
  })
})
