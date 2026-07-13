import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AiConfigList from '../AiConfigList'
import type { AiConfigView } from '@autumn-recruitment/shared'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

const mockSetActive = vi.fn().mockResolvedValue(undefined)
const mockTestConfig = vi.fn().mockResolvedValue({ ok: true })
const mockDeleteConfig = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../../contexts', () => ({
  useSettingsContext: () => ({
    state: {
      aiConfigs: [
        { id: 'a', name: 'DeepSeek', baseUrl: 'https://a/v1', model: 'deepseek-v4-flash', hasApiKey: true, available: true },
        { id: 'b', name: 'OpenAI', baseUrl: 'https://b/v1', model: 'gpt-4o-mini', hasApiKey: true, available: null },
      ] as AiConfigView[],
      activeId: 'a',
      loading: false,
      error: null,
    },
    setActive: mockSetActive,
    testConfig: mockTestConfig,
    deleteConfig: mockDeleteConfig,
  }),
}))

function render() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      <AiConfigList
        onEdit={() => {}}
        onNew={() => {}}
      />,
    )
  })
  return { container, root }
}

describe('AiConfigList', () => {
  let renders: { container: HTMLDivElement; root: Root }[]

  beforeEach(() => {
    renders = []
    vi.clearAllMocks()
  })

  afterEach(async () => {
    for (const r of renders) {
      await act(async () => {
        r.root.unmount()
      })
      r.container.remove()
    }
  })

  it('active row shows no 设为当前 button, inactive row does', () => {
    const { container, root } = render()
    renders.push({ container, root })

    const setAsCurrentButtons = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === '设为当前',
    )
    // 只有一行（非激活的 b）显示"设为当前"，激活行 a 不显示
    expect(setAsCurrentButtons).toHaveLength(1)
  })

  it('clicking test calls testConfig with id', async () => {
    const { container, root } = render()
    renders.push({ container, root })

    const testButtons = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === '测试',
    )
    await act(async () => {
      testButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(mockTestConfig).toHaveBeenCalledWith('a')
  })

  it('delete active row shows confirmation mentioning 正在使用', async () => {
    const { container, root } = render()
    renders.push({ container, root })

    // 激活行 a 的删除按钮是第一个"删除"
    const deleteButtons = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === '删除',
    )
    await act(async () => {
      deleteButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const dialogText = document.body.textContent ?? ''
    expect(dialogText).toContain('正在使用')
  })
})
