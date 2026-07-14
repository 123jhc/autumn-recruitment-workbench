import type { LeetCodeProblem } from '@autumn-recruitment/shared'
import ProblemItem from './ProblemItem'
import EmptyState from '../../../components/EmptyState'
import styles from './ProblemList.module.css'

interface ProblemListProps {
  problems: LeetCodeProblem[]
  onEdit: (problem: LeetCodeProblem) => void
  onDelete: (problem: LeetCodeProblem) => void
  onReview: (problem: LeetCodeProblem) => void
  onComplete: (problem: LeetCodeProblem) => void
  onMove?: (problem: LeetCodeProblem, direction: -1 | 1) => void
}

export default function ProblemList({ problems, onEdit, onDelete, onReview, onComplete, onMove }: ProblemListProps) {
  if (problems.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="暂无题目记录"
        description="当前视图没有符合条件的题目"
      />
    )
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            <th className={styles.colNumber}>#</th>
            <th className={styles.colTitle}>题目</th>
            <th className={styles.colDifficulty}>难度</th>
            <th className={styles.colTopic}>专题</th>
            <th className={styles.colTags}>标签</th>
            <th className={styles.colStatus}>状态</th>
            <th className={styles.colDate}>计划日期</th>
            <th className={styles.colDate}>完成日期</th>
            <th className={styles.colDate}>复习日期</th>
            <th className={styles.colActions}>操作</th>
          </tr>
        </thead>
        <tbody>
          {problems.map((problem) => (
            <ProblemItem
              key={problem.id}
              problem={problem}
              onEdit={onEdit}
              onDelete={onDelete}
              onReview={onReview}
              onComplete={onComplete}
              onMove={onMove}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
