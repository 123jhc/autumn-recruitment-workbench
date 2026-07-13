import { useState, useEffect, type FormEvent } from 'react'
import type { TaskDraft, TaskCategory, TaskPriority } from '@autumn-recruitment/shared'
import { TASK_CATEGORIES, TASK_PRIORITIES } from '@autumn-recruitment/shared'
import { FormField, Select, DatePicker, Button } from '../../../components'
import styles from './DraftEditor.module.css'

interface DraftEditorProps {
  draft: TaskDraft
  onSave: (id: string, patch: Partial<Omit<TaskDraft, 'id' | 'importId'>>) => void
  onCancel: () => void
}

export default function DraftEditor({ draft, onSave, onCancel }: DraftEditorProps) {
  const [form, setForm] = useState({
    title: draft.title,
    category: draft.category,
    plannedDate: draft.plannedDate ?? '',
    dueDate: draft.dueDate ?? '',
    priority: draft.priority,
    estimatedMinutes: draft.estimatedMinutes?.toString() ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setForm({
      title: draft.title,
      category: draft.category,
      plannedDate: draft.plannedDate ?? '',
      dueDate: draft.dueDate ?? '',
      priority: draft.priority,
      estimatedMinutes: draft.estimatedMinutes?.toString() ?? '',
    })
    setErrors({})
  }, [draft])

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = '请输入任务标题'
    if (!form.category) errs.category = '请选择分类'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    onSave(draft.id, {
      title: form.title.trim(),
      category: form.category as TaskCategory,
      plannedDate: form.plannedDate || undefined,
      dueDate: form.dueDate || undefined,
      priority: form.priority as TaskPriority,
      estimatedMinutes: form.estimatedMinutes ? parseInt(form.estimatedMinutes, 10) : undefined,
    })
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
    <form className={styles.form} onSubmit={handleSubmit}>
      <FormField label="标题" required error={errors.title} htmlFor="draft-title">
        <input
          id="draft-title"
          type="text"
          className={styles.input}
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
        />
      </FormField>

      <FormField label="分类" required error={errors.category} htmlFor="draft-category">
        <Select
          id="draft-category"
          options={TASK_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          value={form.category}
          onChange={(v) => setField('category', v)}
        />
      </FormField>

      <FormField label="优先级" htmlFor="draft-priority">
        <Select
          id="draft-priority"
          options={TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
          value={form.priority}
          onChange={(v) => setField('priority', v)}
        />
      </FormField>

      <div className={styles.dateRow}>
        <FormField label="计划日期" htmlFor="draft-planned-date">
          <DatePicker
            id="draft-planned-date"
            value={form.plannedDate}
            onChange={(v) => setField('plannedDate', v)}
          />
        </FormField>

        <FormField label="截止日期" htmlFor="draft-due-date">
          <DatePicker
            id="draft-due-date"
            value={form.dueDate}
            onChange={(v) => setField('dueDate', v)}
          />
        </FormField>
      </div>

      <FormField label="预计耗时（分钟）" htmlFor="draft-estimated">
        <input
          id="draft-estimated"
          type="number"
          className={styles.input}
          value={form.estimatedMinutes}
          onChange={(e) => setField('estimatedMinutes', e.target.value)}
          min={1}
        />
      </FormField>

      <div className={styles.actions}>
        <Button type="button" variant="default" size="small" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" variant="primary" size="small">
          保存
        </Button>
      </div>
    </form>
  )
}
