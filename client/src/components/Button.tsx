import type { ReactNode, ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'default' | 'text'
  size?: 'small' | 'medium'
  loading?: boolean
  children: ReactNode
}

export default function Button({
  variant = 'default',
  size = 'medium',
  loading = false,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={classNames}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <>
          <span className={styles.loadingDot}>.</span>
          <span className={styles.loadingDot}>.</span>
          <span className={styles.loadingDot}>.</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
