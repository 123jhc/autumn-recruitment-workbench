import { useEffect, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmLabel?: string
  confirmVariant?: 'danger' | 'primary'
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = '确认',
  confirmVariant = 'primary',
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    },
    [onClose, loading]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  useEffect(() => {
    if (!isOpen) {
      setLoading(false)
    }
  }, [isOpen])

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className={styles.backdrop} onClick={loading ? undefined : onClose}>
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
          >
            取消
          </button>
          <button
            type="button"
            className={`${styles.confirmButton} ${styles[confirmVariant]}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <span className={styles.spinner} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
