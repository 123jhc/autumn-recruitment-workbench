import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PlanSetupModal from '../PlanSetupModal'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('PlanSetupModal', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it('previews the 100-problem import before confirmation', async () => {
    const onConfirm = vi.fn()
    await act(async () => {
      root.render(<PlanSetupModal isOpen onClose={vi.fn()} onConfirm={onConfirm} existingProblems={[]} />)
    })

    const previewButton = Array.from(document.body.querySelectorAll('button')).find((button) => button.textContent === '预览计划')!
    await act(async () => previewButton.click())

    expect(document.body.textContent).toContain('待新增 100 题')
    expect(document.body.textContent).toContain('哈希 3 题')
    expect(document.body.textContent).toContain('导入并生成计划')
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
