import { useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Drawer.module.css'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: number
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  width = 480,
}: DrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return createPortal(
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div
        className={`${styles.drawer} ${styles.drawerOpen}`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="关闭"
          >
            &#x2715;
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </>,
    document.body
  )
}
