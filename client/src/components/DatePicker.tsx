import styles from './DatePicker.module.css'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  placeholder?: string
  disabled?: boolean
  id?: string
}

export default function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder,
  disabled,
  id,
}: DatePickerProps) {
  return (
    <input
      id={id}
      type="date"
      className={styles.datePicker}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}
