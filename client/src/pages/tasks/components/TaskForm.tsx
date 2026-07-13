import { useState, useEffect, type FormEvent } from 'react'
import type { Task, TaskCategory, TaskPriority, TaskSource } from '@autumn-recruitment/shared'
import { TASK_CATEGORIES, TASK_PRIORITIES } from '@autumn-recruitment/shared'
import { Drawer, FormField, Select, DatePicker, Button, showToast } from '../../../components'
import { useTaskContext } from '../../../contexts'
import styles from './TaskForm.module.css'

interface TaskFormProps {
  isOpen: boolean
  onClose: () => void
  existingTask?: Task | null
}

const EMPTY_FORM = {
  title: '',
  category: '' as TaskCategory | '',
  plannedDate: '',
  dueDate: '',
  priority: 'medium' as TaskPriority,
  estimatedMinutes: '',
  notes: '',
}

export default function TaskForm({ isOpen, onClose, existingTask }: TaskFormProps) {
  const { createTask, updateTask } = useTaskContext()
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEdit = existingTask != null

  useEffect(() => {
    if (isOpen) {
      if (existingTask) {
        setForm({
          title: existingTask.title,
          category: existingTask.category,
          plannedDate: existingTask.plannedDate ?? '',
          dueDate: existingTask.dueDate ?? '',
          priority: existingTask.priority,
          estimatedMinutes: existingTask.estimatedMinutes?.toString() ?? '',
          notes: existingTask.notes ?? '',
        })
      } else {
        setForm(EMPTY_FORM)
      }
      setErrors({})
    }
  }, [isOpen, existingTask])

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = '请输入任务标题'
    if (!form.category) errs.category = '请选择分类'
    if (!form.priority) errs.priority = '请选择优先级'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const base = {
        title: form.title.trim(),
        category: form.category as TaskCategory,
        plannedDate: form.plannedDate || undefined,
        dueDate: form.dueDate || undefined,
        priority: form.priority as TaskPriority,
        estimatedMinutes: form.estimatedMinutes ? parseInt(form.estimatedMinutes, 10) : undefined,
        notes: form.notes.trim() || undefined,
      }

      if (isEdit) {
        await updateTask(existingTask!.id, base)
        showToast('success', '任务已更新')
      } else {
        await createTask({
          ...base,
          status: 'todo',
          source: 'manual' as TaskSource,
        })
        showToast('success', '任务已创建')
      }
      onClose()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? '编辑任务' : '新建任务'}
      width={480}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <FormField label="标题" required error={errors.title} htmlFor="task-title">
          <input
            id="task-title"
            type="text"
            className={styles.input}
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="输入任务标题"
            autoFocus
          />
        </FormField>

        <FormField label="分类" required error={errors.category} htmlFor="task-category">
          <Select
            id="task-category"
            options={TASK_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            value={form.category}
            onChange={(v) => setField('category', v)}
            placeholder="选择分类"
          />
        </FormField>

        <FormField label="优先级" required error={errors.priority} htmlFor="task-priority">
          <Select
            id="task-priority"
            options={TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
            value={form.priority}
            onChange={(v) => setField('priority', v)}
          />
        </FormField>

        <div className={styles.dateRow}>
          <FormField label="计划日期" htmlFor="task-planned-date">
            <DatePicker
              id="task-planned-date"
              value={form.plannedDate}
              onChange={(v) => setField('plannedDate', v)}
              placeholder="选择计划日期"
            />
          </FormField>

          <FormField label="截止日期" htmlFor="task-due-date">
            <DatePicker
              id="task-due-date"
              value={form.dueDate}
              onChange={(v) => setField('dueDate', v)}
              placeholder="选择截止日期"
            />
          </FormField>
        </div>

        <FormField label="预计耗时（分钟）" htmlFor="task-estimated">
          <input
            id="task-estimated"
            type="number"
            className={styles.input}
            value={form.estimatedMinutes}
            onChange={(e) => setField('estimatedMinutes', e.target.value)}
            placeholder="例如 60"
            min={1}
          />
        </FormField>

        <FormField label="备注" htmlFor="task-notes">
          <textarea
            id="task-notes"
            className={styles.textarea}
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="可选备注"
            rows={3}
          />
        </FormField>

        <div className={styles.footer}>
          <Button type="button" variant="default" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {isEdit ? '保存' : '创建'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
