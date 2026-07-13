import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AiConfigForm from '../AiConfigForm'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

// AiConfigForm uses Drawer which renders via createPortal → document.body.
// Query within the dialog role to scope to the drawer content.
function dialog() {
  return document.querySelector('[role="dialog"]')!
}

// Helper: set input value and dispatch input event (required for React onChange in portals)
function setInputValue(input: HTMLInputElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )!.set!
  nativeSetter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

// AiConfigForm 不依赖 context，onSubmit 由 props 注入
function render(props: Omit<Parameters<typeof AiConfigForm>[0], 'onSubmit'>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  let submitted: any = undefined
  act(() => {
    root.render(
      <AiConfigForm
        {...props}
        onSubmit={async (data) => {
          submitted = data
        }}
      />,
    )
  })
  return {
    container,
    root,
    submitted: () => submitted,
    setSubmitted: (v: any) => (submitted = v),
  }
}

describe('AiConfigForm', () => {
  let cases: ReturnType<typeof render>[]

  beforeEach(() => {
    cases = []
  })

  afterEach(async () => {
    for (const c of cases) {
      await act(async () => {
        c.root.unmount()
      })
      c.container.remove()
    }
  })

  it('new mode: shows empty fields with sk-... placeholder and default model', () => {
    const c = render({ isOpen: true, onClose: () => {}, editing: null })
    cases.push(c)

    const inputs = dialog().querySelectorAll('input')
    const nameInput = inputs[0] as HTMLInputElement
    const urlInput = inputs[1] as HTMLInputElement
    const keyInput = inputs[2] as HTMLInputElement
    const modelInput = inputs[3] as HTMLInputElement

    expect(nameInput.value).toBe('')
    expect(urlInput.value).toBe('https://api.deepseek.com/v1')
    expect(keyInput.value).toBe('')
    expect(keyInput.placeholder).toContain('sk-')
    expect(modelInput.value).toBe('deepseek-v4-flash')
  })

  it('edit mode: prefills name/url/model, leaves key empty with 不修改 placeholder', () => {
    const c = render({
      isOpen: true,
      onClose: () => {},
      editing: {
        id: '1',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-v4-flash',
        hasApiKey: true,
        available: null,
      },
    })
    cases.push(c)

    const inputs = dialog().querySelectorAll('input')
    expect((inputs[0] as HTMLInputElement).value).toBe('DeepSeek')
    expect((inputs[1] as HTMLInputElement).value).toBe('https://api.deepseek.com/v1')
    expect((inputs[2] as HTMLInputElement).value).toBe('')
    expect((inputs[2] as HTMLInputElement).placeholder).toContain('不修改')
    expect((inputs[3] as HTMLInputElement).value).toBe('deepseek-v4-flash')
  })

  it('edit mode submit with empty key omits apiKey', async () => {
    const c = render({
      isOpen: true,
      onClose: () => {},
      editing: {
        id: '1',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-v4-flash',
        hasApiKey: true,
        available: null,
      },
    })
    cases.push(c)

    const form = dialog().querySelector('form')!
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(c.submitted()).toEqual({
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-flash',
    })
    expect(c.submitted().apiKey).toBeUndefined()
  })

  it('new mode submit with key includes apiKey', async () => {
    const c = render({ isOpen: true, onClose: () => {}, editing: null })
    cases.push(c)

    const inputs = dialog().querySelectorAll('input')
    await act(async () => {
      setInputValue(inputs[0] as HTMLInputElement, 'A')
      setInputValue(inputs[2] as HTMLInputElement, 'sk-new')
    })

    const form = dialog().querySelector('form')!
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(c.submitted().apiKey).toBe('sk-new')
  })
})
