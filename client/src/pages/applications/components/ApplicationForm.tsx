import { useState, type FormEvent } from 'react'
import type { Application, ApplicationStatus } from '@autumn-recruitment/shared'
import { APPLICATION_STATUSES } from '@autumn-recruitment/shared'
import { Drawer, Button, FormField, Select, DatePicker } from '../../../components'
import styles from './ApplicationForm.module.css'

const STATUS_OPTIONS = APPLICATION_STATUSES.map((s) => ({
  value: s.value,
  label: s.label,
}))

interface ApplicationFormData {
  company: string
  role: string
  location: string
  url: string
  requirements: string
  status: ApplicationStatus
  appliedDate: string
  nextAction: string
  nextActionDate: string
  notes: string
}

const EMPTY_FORM: ApplicationFormData = {
  company: '',
  role: '',
  location: '',
  url: '',
  requirements: '',
  status: 'target',
  appliedDate: '',
  nextAction: '',
  nextActionDate: '',
  notes: '',
}

interface ApplicationFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ApplicationFormData) => Promise<void>
  editing?: Application | null
}

export default function ApplicationForm({
  isOpen,
  onClose,
  onSubmit,
  editing,
}: ApplicationFormProps) {
  const isEditing = editing != null
  const [form, setForm] = useState<ApplicationFormData>(() => {
    if (editing) {
      return {
        company: editing.company,
        role: editing.role,
        location: editing.location ?? '',
        url: editing.url ?? '',
        requirements: editing.requirements ?? '',
        status: editing.status,
        appliedDate: editing.appliedDate ?? '',
        nextAction: editing.nextAction ?? '',
        nextActionDate: editing.nextActionDate ?? '',
        notes: editing.notes ?? '',
      }
    }
    return { ...EMPTY_FORM }
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateField = (field: keyof ApplicationFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.company.trim()) next.company = '请输入公司名称'
    if (!form.role.trim()) next.role = '请输入岗位名称'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      await onSubmit(form)
      setForm({ ...EMPTY_FORM })
    } catch (err) {
      // Let the caller handle the error via toast
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setForm({ ...EMPTY_FORM })
    setErrors({})
    onClose()
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? '编辑岗位' : '新增岗位'}
      width={520}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <FormField label="公司" required error={errors.company} htmlFor="app-company">
            <input
              id="app-company"
              className={styles.input}
              type="text"
              value={form.company}
              onChange={(e) => updateField('company', e.target.value)}
              placeholder="例如：字节跳动"
            />
          </FormField>
          <FormField label="岗位" required error={errors.role} htmlFor="app-role">
            <input
              id="app-role"
              className={styles.input}
              type="text"
              value={form.role}
              onChange={(e) => updateField('role', e.target.value)}
              placeholder="例如：后端开发工程师"
            />
          </FormField>
        </div>

        <div className={styles.formGroup}>
          <FormField label="地点" htmlFor="app-location">
            <input
              id="app-location"
              className={styles.input}
              type="text"
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="例如：北京"
            />
          </FormField>
          <FormField label="状态" required htmlFor="app-status">
            <Select
              id="app-status"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(value) => updateField('status', value as ApplicationStatus)}
            />
          </FormField>
        </div>

        <FormField label="链接" htmlFor="app-url">
          <input
            id="app-url"
            className={styles.input}
            type="url"
            value={form.url}
            onChange={(e) => updateField('url', e.target.value)}
            placeholder="https://..."
          />
        </FormField>

        <FormField label="岗位要求" htmlFor="app-requirements">
          <textarea
            id="app-requirements"
            className={styles.textarea}
            value={form.requirements}
            onChange={(e) => updateField('requirements', e.target.value)}
            placeholder="描述岗位的关键要求..."
            rows={3}
          />
        </FormField>

        <div className={styles.formGroup}>
          <FormField label="投递日期" htmlFor="app-appliedDate">
            <DatePicker
              id="app-appliedDate"
              value={form.appliedDate}
              onChange={(value) => updateField('appliedDate', value)}
            />
          </FormField>
        </div>

        <div className={styles.formGroup}>
          <FormField label="下一步行动" htmlFor="app-nextAction">
            <input
              id="app-nextAction"
              className={styles.input}
              type="text"
              value={form.nextAction}
              onChange={(e) => updateField('nextAction', e.target.value)}
              placeholder="例如：准备简历"
            />
          </FormField>
          <FormField label="行动日期" htmlFor="app-nextActionDate">
            <DatePicker
              id="app-nextActionDate"
              value={form.nextActionDate}
              onChange={(value) => updateField('nextActionDate', value)}
            />
          </FormField>
        </div>

        <FormField label="备注" htmlFor="app-notes">
          <textarea
            id="app-notes"
            className={styles.textarea}
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="其他备注信息..."
            rows={3}
          />
        </FormField>

        <div className={styles.actions}>
          <Button variant="default" onClick={handleClose} disabled={submitting}>
            取消
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            {isEditing ? '保存修改' : '新增岗位'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export type { ApplicationFormData }
