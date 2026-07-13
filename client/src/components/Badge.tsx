import type { ReactNode } from 'react'
import styles from './Badge.module.css'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  children: ReactNode
}

export default function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>{children}</span>
  )
}
