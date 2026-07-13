import type { LeetCodeProblem } from '@autumn-recruitment/shared'
import { DIFFICULTIES } from '@autumn-recruitment/shared'
import Badge from '../../../components/Badge'
import styles from './WeekStats.module.css'

interface WeekStatsProps {
  solvedThisWeek: LeetCodeProblem[]
}

export default function WeekStats({ solvedThisWeek }: WeekStatsProps) {
  const total = solvedThisWeek.length
  const countByDiff: Record<string, number> = { easy: 0, medium: 0, hard: 0 }
  for (const p of solvedThisWeek) {
    countByDiff[p.difficulty]++
  }

  return (
    <div className={styles.statsBar}>
      <span className={styles.total}>
        本周完成: <strong>{total}</strong> 题
      </span>
      <div className={styles.breakdown}>
        {DIFFICULTIES.map((d) => (
          <span key={d.value} className={styles.diffItem}>
            <Badge
              variant={
                d.value === 'easy' ? 'success' : d.value === 'medium' ? 'warning' : 'danger'
              }
            >
              {d.label}
            </Badge>
            <span className={styles.count}>{countByDiff[d.value]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
