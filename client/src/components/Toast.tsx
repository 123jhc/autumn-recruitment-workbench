import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styles from './Toast.module.css'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: number
  type: ToastType
  message: string
  exiting?: boolean
}

type Listener = (toasts: ToastItem[]) => void

let nextId = 0
const listeners = new Set<Listener>()
let state: ToastItem[] = []

const ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
}

function notify() {
  for (const listener of listeners) {
    listener([...state])
  }
}

function removeToast(id: number) {
  state = state.filter((t) => t.id !== id)
  notify()
}

export function showToast(type: ToastType, message: string) {
  const id = ++nextId
  const toast: ToastItem = { id, type, message }
  state = [...state, toast]
  notify()

  setTimeout(() => {
    state = state.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    notify()
    setTimeout(() => removeToast(id), 200)
  }, 3000)
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>(state)

  useEffect(() => {
    const listener: Listener = (updated) => setToasts(updated)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const handleClose = useCallback((id: number) => {
    state = state.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    notify()
    setTimeout(() => removeToast(id), 200)
  }, [])

  if (toasts.length === 0) return null

  return createPortal(
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]} ${toast.exiting ? styles.toastExiting : ''}`}
          role="alert"
        >
          <span className={styles.icon}>{ICONS[toast.type]}</span>
          <span className={styles.message}>{toast.message}</span>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => handleClose(toast.id)}
            aria-label="关闭"
          >
            &#x2715;
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}
