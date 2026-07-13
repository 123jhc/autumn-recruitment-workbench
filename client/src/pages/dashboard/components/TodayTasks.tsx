import { useState } from 'react'
import type { Task, TaskPriority, TaskCategory } from '@autumn-recruitment/shared'
import { TASK_CATEGORIES } from '@autumn-recruitment/shared'
import { useTaskContext } from '../../../contexts'
import { todayShanghai, formatDate } from '../../../hooks/use-date-utils'
import { Badge, EmptyState, Button, Modal, FormField, Select, DatePicker, showToast } from '../../../components'
import styles from './TodayTasks.module.css'

interface TodayTasksProps {
  tasks: Task[]
  loading: boolean
}

const CATEGORY_LABELS = Object.fromEntries(TASK_CATEGORIES.map((c) => [c.value, c.label]))

const PRIORITY_OPTIONS = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

export default function TodayTasks({ tasks, loading }: TodayTasksProps) {
  const { completeTask, uncompleteTask, createTask } = useTaskContext()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state for quick task creation
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<TaskCategory>('other')
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const [newPlannedDate, setNewPlannedDate] = useState(() => todayShanghai())
  const [newDueDate, setNewDueDate] = useState('')

  const today = todayShanghai()
  const todoTasks = tasks.filter((t) => t.status === 'todo')
  const completedTasks = tasks.filter((t) => t.status === 'done')
  const total = tasks.length
  const completed = completedTasks.length

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

  const handleCreateTask = async () => {
    if (!newTitle.trim()) {
      showToast('warning', '请输入任务标题')
      return
    }
    setSubmitting(true)
    try {
      await createTask({
        title: newTitle.trim(),
        category: newCategory,
        priority: newPriority,
        plannedDate: newPlannedDate,
        dueDate: newDueDate || undefined,
        status: 'todo',
        source: 'manual',
      })
      showToast('success', '任务已创建')
      setShowCreateModal(false)
      // Reset form
      setNewTitle('')
      setNewCategory('other')
      setNewPriority('medium')
      setNewPlannedDate(todayShanghai())
      setNewDueDate('')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '创建任务失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenModal = () => {
    setShowCreateModal(true)
  }

  if (loading) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>今日任务</h2>
        </div>
        <p style={{ color: 'var(--color-text-disabled)', fontSize: 13 }}>加载中...</p>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>今日任务</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={styles.count}>
            已完成 {completed}/{total} 项
          </span>
          <Button size="small" variant="primary" onClick={handleOpenModal}>
            新建任务
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="今天没有待办任务"
          description="点击「新建任务」按钮添加今日任务，或前往计划导入页面拆解规划"
          actionLabel="新建任务"
          onAction={handleOpenModal}
        />
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
                <div className={`${styles.taskTitle} ${task.status === 'done' ? styles.taskTitleDone : ''}`}>
                  {task.title}
                </div>
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
                  {task.plannedDate && (
                    <span className={styles.dateLabel}>
                      计划: {formatDate(task.plannedDate)}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className={styles.dateLabel}>
                      截止: {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Quick task creation modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新建任务"
        width={480}
        footer={
          <div className={styles.modalFooter}>
            <Button variant="default" onClick={() => setShowCreateModal(false)}>
              取消
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleCreateTask}>
              创建
            </Button>
          </div>
        }
      >
        <div className={styles.quickTaskForm}>
          <FormField label="任务标题" required htmlFor="quick-task-title">
            <input
              id="quick-task-title"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="输入任务标题"
              autoFocus
              style={{
                width: '100%',
                height: 32,
                padding: '0 10px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                fontSize: 14,
              }}
            />
          </FormField>
          <div className={styles.formRow}>
            <FormField label="分类" htmlFor="quick-task-category">
              <Select
                id="quick-task-category"
                options={TASK_CATEGORIES}
                value={newCategory}
                onChange={(v) => setNewCategory(v as TaskCategory)}
              />
            </FormField>
            <FormField label="优先级" htmlFor="quick-task-priority">
              <Select
                id="quick-task-priority"
                options={PRIORITY_OPTIONS}
                value={newPriority}
                onChange={(v) => setNewPriority(v as TaskPriority)}
              />
            </FormField>
          </div>
          <div className={styles.formRow}>
            <FormField label="计划日期" htmlFor="quick-task-planned-date">
              <DatePicker
                id="quick-task-planned-date"
                value={newPlannedDate}
                onChange={setNewPlannedDate}
              />
            </FormField>
            <FormField label="截止日期" htmlFor="quick-task-due-date">
              <DatePicker
                id="quick-task-due-date"
                value={newDueDate}
                onChange={setNewDueDate}
              />
            </FormField>
          </div>
        </div>
      </Modal>
    </div>
  )
}
