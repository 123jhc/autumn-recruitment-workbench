import styles from './WeekProgress.module.css'

interface WeekProgressProps {
  total: number
  completed: number
  weekLabel: string
}

function getColorLevel(pct: number): 'high' | 'medium' | 'low' {
  if (pct >= 70) return 'high'
  if (pct >= 30) return 'medium'
  return 'low'
}

export default function WeekProgress({ total, completed, weekLabel }: WeekProgressProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const level = getColorLevel(pct)

  return (
    <div className={styles.progress}>
      <div className={styles.bar}>
        <div
          className={`${styles.fill} ${level === 'high' ? styles.fillHigh : level === 'medium' ? styles.fillMedium : styles.fillLow}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={styles.stats}>
        <span className={styles.label}>
          本周 ({weekLabel}) 完成 {completed}/{total} 项任务
        </span>
        <span
          className={`${styles.percentage} ${level === 'high' ? styles.pctHigh : level === 'medium' ? styles.pctMedium : styles.pctLow}`}
        >
          {pct}%
        </span>
      </div>
    </div>
  )
}
