import styles from './Select.module.css'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
}

export default function Select({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  id,
}: SelectProps) {
  return (
    <select
      id={id}
      className={styles.select}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
