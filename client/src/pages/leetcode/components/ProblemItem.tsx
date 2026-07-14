import type { LeetCodeProblem } from '@autumn-recruitment/shared'
import { DIFFICULTIES, PROBLEM_STATUSES } from '@autumn-recruitment/shared'
import Badge from '../../../components/Badge'
import Button from '../../../components/Button'
import styles from './ProblemItem.module.css'

interface ProblemItemProps {
  problem: LeetCodeProblem
  onEdit: (problem: LeetCodeProblem) => void
  onDelete: (problem: LeetCodeProblem) => void
  onReview: (problem: LeetCodeProblem) => void
  onComplete: (problem: LeetCodeProblem) => void
  onMove?: (problem: LeetCodeProblem, direction: -1 | 1) => void
}

const DIFFICULTY_VARIANT: Record<string, 'success' | 'warning' | 'danger'> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning'> = {
  todo: 'default',
  solved: 'success',
  review: 'warning',
}

export default function ProblemItem({ problem, onEdit, onDelete, onReview, onComplete, onMove }: ProblemItemProps) {
  const difficultyLabel = DIFFICULTIES.find((d) => d.value === problem.difficulty)?.label ?? problem.difficulty
  const statusLabel = PROBLEM_STATUSES.find((s) => s.value === problem.status)?.label ?? problem.status

  return (
    <tr className={styles.row}>
      <td className={styles.cellNumber}>
        {problem.number != null ? `#${problem.number}` : '-'}
      </td>
      <td className={styles.cellTitle}>
        {problem.url ? (
          <a
            href={problem.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.titleLink}
          >
            {problem.title}
          </a>
        ) : (
          <span className={styles.titleText}>{problem.title}</span>
        )}
      </td>
      <td className={styles.cellDifficulty}>
        <Badge variant={DIFFICULTY_VARIANT[problem.difficulty] ?? 'default'}>
          {difficultyLabel}
        </Badge>
      </td>
      <td className={styles.cellDate}>{problem.topic ?? '其他题目'}</td>
      <td className={styles.cellTags}>
        {problem.tags.length > 0 ? (
          <div className={styles.tagsList}>
            {problem.tags.map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        ) : (
          <span className={styles.noTags}>-</span>
        )}
      </td>
      <td className={styles.cellStatus}>
        <Badge variant={STATUS_VARIANT[problem.status] ?? 'default'}>
          {statusLabel}
        </Badge>
      </td>
      <td className={styles.cellDate}>
        {problem.plannedDate ?? '-'}
      </td>
      <td className={styles.cellDate}>
        {problem.solvedDate ?? '-'}
      </td>
      <td className={styles.cellDate}>
        {problem.reviewDate ?? '-'}
      </td>
      <td className={styles.cellActions}>
        <div className={styles.actionButtons}>
          {problem.status === 'todo' && (
            <Button size="small" variant="text" onClick={() => onComplete(problem)}>完成</Button>
          )}
          {problem.status === 'todo' && onMove && (
            <>
              <Button size="small" variant="text" onClick={() => onMove(problem, -1)} aria-label={`前移 ${problem.title}`}>↑</Button>
              <Button size="small" variant="text" onClick={() => onMove(problem, 1)} aria-label={`后移 ${problem.title}`}>↓</Button>
            </>
          )}
          {problem.status === 'review' && (
            <Button size="small" variant="text" onClick={() => onReview(problem)}>
              完成复习
            </Button>
          )}
          <Button size="small" variant="text" onClick={() => onEdit(problem)}>
            编辑
          </Button>
          <Button size="small" variant="text" className={styles.deleteBtn} onClick={() => onDelete(problem)}>
            删除
          </Button>
        </div>
      </td>
    </tr>
  )
}
