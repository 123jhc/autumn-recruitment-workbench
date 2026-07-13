import { useState, useEffect } from 'react'
import { useTaskContext } from '../../../contexts'
import { applicationDal } from '../../../dal/application.dal'
import type { Task } from '@autumn-recruitment/shared'
import { TASK_CATEGORIES, TASK_PRIORITIES } from '@autumn-recruitment/shared'
import { Button, Badge, ConfirmDialog, showToast } from '../../../components'
import type { TaskCategory } from '@autumn-recruitment/shared'
import styles from './TaskList.module.css'
import TaskItem from './TaskItem'

interface TaskListProps {
  onEdit: (task: Task) => void
}

export default function TaskList({ onEdit }: TaskListProps) {
  const { state, completeTask, uncompleteTask, deleteTask, loadTasks } = useTaskContext()
  const { tasks, loading, error, view, filter } = state

  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [existingAppIds, setExistingAppIds] = useState<Set<string>>(new Set())

  // Load existing application IDs to check for deleted sources
  useEffect(() => {
    applicationDal.getAll().then((apps) => {
      setExistingAppIds(new Set(apps.map((a) => a.id)))
    })
  }, [tasks])

  // Client-side filtering
  const filteredTasks = tasks.filter((task) => {
    if (filter.category && task.category !== filter.category) return false
    if (filter.status && task.status !== filter.status) return false
    if (filter.source && task.source !== filter.source) return false
    return true
  })

  const handleComplete = async (task: Task) => {
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

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTask(deleteTarget.id)
      showToast('success', '任务已删除')
      setDeleteTarget(null)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const getCategoryLabel = (cat: TaskCategory): string => {
    return TASK_CATEGORIES.find((c) => c.value === cat)?.label ?? cat
  }

  const getPriorityLabel = (p: string): string => {
    return TASK_PRIORITIES.find((pr) => pr.value === p)?.label ?? p
  }

  if (loading && tasks.length === 0) {
    return <div className={styles.status}>加载中...</div>
  }

  if (error) {
    return (
      <div className={styles.status}>
        <p className={styles.errorText}>{error}</p>
        <Button size="small" onClick={loadTasks}>
          重试
        </Button>
      </div>
    )
  }

  if (filteredTasks.length === 0) {
    const viewLabel =
      view === 'today' ? '今天' : view === 'week' ? '本周' : view === 'completed' ? '已完成' : '全部'
    return (
      <div className={styles.status}>
        <p className={styles.emptyText}>
          {filter.category || filter.status
            ? '没有符合条件的任务'
            : `${viewLabel}没有任务`}
        </p>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {filteredTasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          categoryLabel={getCategoryLabel(task.category)}
          priorityLabel={getPriorityLabel(task.priority)}
          isAppDeleted={
            task.source === 'application' && task.sourceId != null
              ? !existingAppIds.has(task.sourceId)
              : false
          }
          onComplete={() => handleComplete(task)}
          onEdit={() => onEdit(task)}
          onDelete={() => setDeleteTarget(task)}
        />
      ))}

      {deleteTarget && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          title="删除任务"
          message={`确定要删除任务「${deleteTarget.title}」吗？此操作不可撤销。`}
          confirmLabel={deleting ? '删除中...' : '删除'}
          confirmVariant="danger"
        />
      )}
    </div>
  )
}
