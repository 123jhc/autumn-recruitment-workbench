import type { ApplicationStatus } from '@autumn-recruitment/shared'
import { APPLICATION_STATUSES } from '@autumn-recruitment/shared'
import styles from './StatusBoard.module.css'

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  target: '#1677ff',
  preparing: '#13c2c2',
  applied: '#fa8c16',
  assessment: '#722ed1',
  interview: '#d48806',
  offer: '#52c41a',
  rejected: '#f5222d',
}

interface StatusBoardProps {
  countByStatus: Record<string, number>
  activeStatus: ApplicationStatus | null
  onSelectStatus: (status: ApplicationStatus | null) => void
}

export default function StatusBoard({
  countByStatus,
  activeStatus,
  onSelectStatus,
}: StatusBoardProps) {
  return (
    <div className={styles.board}>
      {APPLICATION_STATUSES.map(({ value, label }) => {
        const count = countByStatus[value] || 0
        const isActive = activeStatus === value
        const color = STATUS_COLORS[value]

        return (
          <div
            key={value}
            className={`${styles.card} ${isActive ? styles.active : ''}`}
            style={
              { '--status-color': color } as React.CSSProperties
            }
            onClick={() => onSelectStatus(isActive ? null : value)}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectStatus(isActive ? null : value)
              }
            }}
          >
            <span className={styles.label}>{label}</span>
            <span className={styles.count}>{count}</span>
          </div>
        )
      })}
    </div>
  )
}
