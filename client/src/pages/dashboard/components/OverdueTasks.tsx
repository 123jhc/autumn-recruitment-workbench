import type { Task } from '@autumn-recruitment/shared'
import { TASK_CATEGORIES } from '@autumn-recruitment/shared'
import { useTaskContext } from '../../../contexts'
import { formatDate } from '../../../hooks/use-date-utils'
import { Badge, showToast } from '../../../components'
import styles from './OverdueTasks.module.css'

interface OverdueTasksProps {
  tasks: Task[]
  loading: boolean
}

const CATEGORY_LABELS = Object.fromEntries(TASK_CATEGORIES.map((c) => [c.value, c.label]))

export default function OverdueTasks({ tasks, loading }: OverdueTasksProps) {
  const { completeTask, uncompleteTask } = useTaskContext()

  const handleToggle = async (task: Task) => {
    try {
      if (task.status === 'done') {
        await uncompleteTask(task.id)
      } else {
        await completeTask(task.id)
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '操作失败')
    }
  }

  if (loading) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>逾期任务</h2>
        </div>
        <p style={{ color: 'var(--color-text-disabled)', fontSize: 13 }}>加载中...</p>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>逾期任务</h2>
        {tasks.length > 0 && (
          <span className={styles.count}>{tasks.length} 项逾期</span>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className={styles.emptyOk}>很好，目前没有逾期任务</div>
      ) : (
        <ul className={styles.list}>
          {tasks.map((task) => (
            <li key={task.id} className={styles.item}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={task.status === 'done'}
                onChange={() => handleToggle(task)}
              />
              <div className={styles.taskBody}>
                <div className={styles.taskTitle}>{task.title}</div>
                <div className={styles.taskMeta}>
                  <Badge variant="info">{CATEGORY_LABELS[task.category] ?? task.category}</Badge>
                  {task.priority === 'high' && (
                    <span className={styles.priorityHigh}>高优先</span>
                  )}
                  {task.priority === 'medium' && (
                    <span className={styles.priorityMedium}>中优先</span>
                  )}
                  {task.priority === 'low' && (
                    <span className={styles.priorityLow}>低优先</span>
                  )}
                  {task.dueDate && (
                    <span className={styles.dueDate}>
                      截止: {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
