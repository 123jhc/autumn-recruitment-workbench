import { useState } from 'react'
import type { LeetCodeProblem } from '@autumn-recruitment/shared'
import { DIFFICULTIES } from '@autumn-recruitment/shared'
import { useLeetCodeContext } from '../../../contexts'
import { todayShanghai, formatDate } from '../../../hooks/use-date-utils'
import { Badge, Button, showToast } from '../../../components'
import styles from './ReviewReminders.module.css'

interface ReviewRemindersProps {
  problems: LeetCodeProblem[]
  loading: boolean
}

const DIFFICULTY_LABELS = Object.fromEntries(DIFFICULTIES.map((d) => [d.value, d.label]))
const DIFFICULTY_COLORS: Record<string, string> = Object.fromEntries(DIFFICULTIES.map((d) => [d.value, d.color]))

function difficultyBadgeVariant(difficulty: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (difficulty) {
    case 'easy': return 'success'
    case 'medium': return 'warning'
    case 'hard': return 'danger'
    default: return 'default'
  }
}

export default function ReviewReminders({ problems, loading }: ReviewRemindersProps) {
  const { completeReview } = useLeetCodeContext()
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())

  const today = todayShanghai()

  const handleCompleteReview = async (problem: LeetCodeProblem) => {
    setCompletingIds((prev) => new Set(prev).add(problem.id))
    try {
      await completeReview(problem.id)
      showToast('success', `已完成复习: #${problem.number ?? ''} ${problem.title}`)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '操作失败')
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev)
        next.delete(problem.id)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>LeetCode 复习提醒</h2>
        </div>
        <p style={{ color: 'var(--color-text-disabled)', fontSize: 13 }}>加载中...</p>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>LeetCode 复习提醒</h2>
        {problems.length > 0 && (
          <span className={styles.count}>{problems.length} 题待复习</span>
        )}
      </div>

      {problems.length === 0 ? (
        <div className={styles.emptyState}>今天没有需要复习的题目</div>
      ) : (
        <ul className={styles.list}>
          {problems.map((problem) => {
            const isOverdue = problem.reviewDate != null && problem.reviewDate < today
            const isCompleting = completingIds.has(problem.id)
            return (
              <li
                key={problem.id}
                className={`${styles.item} ${isOverdue ? styles.itemOverdue : ''}`}
              >
                <div className={styles.info}>
                  <div className={styles.problemTitle}>
                    #{problem.number ?? '-'} {problem.title}
                    <Badge variant={difficultyBadgeVariant(problem.difficulty)}>
                      {DIFFICULTY_LABELS[problem.difficulty] ?? problem.difficulty}
                    </Badge>
                  </div>
                  <div className={styles.problemMeta}>
                    {problem.tags.length > 0 && (
                      <span>{problem.tags.slice(0, 3).join(' / ')}</span>
                    )}
                    {problem.reviewDate && (
                      <span className={`${styles.reviewDate} ${isOverdue ? styles.reviewDateOverdue : ''}`}>
                        {isOverdue ? '已逾期: ' : '复习日: '}
                        {formatDate(problem.reviewDate)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="small"
                  variant="primary"
                  loading={isCompleting}
                  onClick={() => handleCompleteReview(problem)}
                >
                  完成复习
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
