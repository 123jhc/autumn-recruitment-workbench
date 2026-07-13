import type { TaskDraft } from '@autumn-recruitment/shared'
import { TASK_CATEGORIES, TASK_PRIORITIES } from '@autumn-recruitment/shared'
import { Button, Badge } from '../../../components'
import styles from './DraftItem.module.css'

interface DraftItemProps {
  draft: TaskDraft
  onEdit: (draft: TaskDraft) => void
  onDelete: (id: string) => void
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
}

export default function DraftItem({ draft, onEdit, onDelete }: DraftItemProps) {
  const categoryLabel = TASK_CATEGORIES.find((c) => c.value === draft.category)?.label ?? draft.category
  const priorityLabel = TASK_PRIORITIES.find((p) => p.value === draft.priority)?.label ?? draft.priority

  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <div className={styles.title}>{draft.title}</div>
        <div className={styles.meta}>
          <Badge variant="default">{categoryLabel}</Badge>
          <Badge variant={PRIORITY_COLORS[draft.priority] as 'danger' | 'warning' | 'info'}>
            {priorityLabel}
          </Badge>
          {draft.plannedDate && <span className={styles.date}>计划: {draft.plannedDate}</span>}
          {draft.dueDate && <span className={styles.date}>截止: {draft.dueDate}</span>}
          {draft.estimatedMinutes != null && <span className={styles.date}>预计 {draft.estimatedMinutes} 分钟</span>}
        </div>
        {draft.rationale && <p className={styles.rationale}>{draft.rationale}</p>}
      </div>
      <div className={styles.actions}>
        <Button variant="text" size="small" onClick={() => onEdit(draft)}>
          编辑
        </Button>
        <Button variant="text" size="small" onClick={() => onDelete(draft.id)}>
          删除
        </Button>
      </div>
    </div>
  )
}
