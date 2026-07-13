import type { ReactNode } from 'react'
import styles from './FormField.module.css'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  htmlFor?: string
  children: ReactNode
}

export default function FormField({
  label,
  error,
  required,
  htmlFor,
  children,
}: FormFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      {children}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
