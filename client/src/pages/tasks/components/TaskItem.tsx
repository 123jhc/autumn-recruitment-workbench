import type { Task } from '@autumn-recruitment/shared'
import { Badge, Button } from '../../../components'
import styles from './TaskItem.module.css'

interface TaskItemProps {
  task: Task
  categoryLabel: string
  priorityLabel: string
  isAppDeleted: boolean
  onComplete: () => void
  onEdit: () => void
  onDelete: () => void
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
}

export default function TaskItem({
  task,
  categoryLabel,
  priorityLabel,
  isAppDeleted,
  onComplete,
  onEdit,
  onDelete,
}: TaskItemProps) {
  const isDone = task.status === 'done'

  return (
    <div className={`${styles.row} ${isDone ? styles.done : ''}`}>
      <div className={styles.main}>
        <button
          type="button"
          className={`${styles.checkbox} ${isDone ? styles.checked : ''}`}
          onClick={onComplete}
          aria-label={isDone ? '取消完成' : '完成'}
        >
          {isDone ? '✓' : ''}
        </button>

        <div className={styles.info}>
          <div className={styles.titleRow}>
            <span className={`${styles.title} ${isDone ? styles.titleDone : ''}`}>
              {task.title}
            </span>
            {isAppDeleted && (
              <span className={styles.deletedSource}>来源已删除</span>
            )}
          </div>
          <div className={styles.meta}>
            <Badge variant="default">{categoryLabel}</Badge>
            <Badge variant={PRIORITY_COLORS[task.priority] as 'danger' | 'warning' | 'info'}>
              {priorityLabel}
            </Badge>
            {task.plannedDate && (
              <span className={styles.date}>计划: {task.plannedDate}</span>
            )}
            {task.dueDate && (
              <span className={`${styles.date} ${!isDone && task.dueDate < new Date().toISOString().slice(0, 10) ? styles.overdue : ''}`}>
                截止: {task.dueDate}
              </span>
            )}
            {task.estimatedMinutes != null && (
              <span className={styles.date}>预计 {task.estimatedMinutes} 分钟</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="text" size="small" onClick={onEdit}>
          编辑
        </Button>
        <Button variant="text" size="small" onClick={onDelete}>
          删除
        </Button>
      </div>
    </div>
  )
}
