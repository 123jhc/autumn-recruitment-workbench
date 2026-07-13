import { useState } from 'react'
import type { LeetCodeProblem } from '@autumn-recruitment/shared'
import Modal from '../../../components/Modal'
import FormField from '../../../components/FormField'
import DatePicker from '../../../components/DatePicker'
import Button from '../../../components/Button'
import styles from './ReviewAction.module.css'

interface ReviewActionProps {
  isOpen: boolean
  onClose: () => void
  problem: LeetCodeProblem | null
  onComplete: (id: string, newReviewDate?: string) => Promise<void>
}

export default function ReviewAction({ isOpen, onClose, problem, onComplete }: ReviewActionProps) {
  const [nextReviewDate, setNextReviewDate] = useState('')
  const [saving, setSaving] = useState(false)

  const handleClose = () => {
    setNextReviewDate('')
    setSaving(false)
    onClose()
  }

  const handleConfirm = async () => {
    if (!problem) return
    setSaving(true)
    try {
      await onComplete(problem.id, nextReviewDate || undefined)
      handleClose()
    } catch {
      // Error handled by caller
    } finally {
      setSaving(false)
    }
  }

  const footer = (
    <div className={styles.footerActions}>
      <Button variant="default" onClick={handleClose} disabled={saving}>
        取消
      </Button>
      <Button variant="primary" onClick={handleConfirm} loading={saving}>
        确认完成复习
      </Button>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="完成复习"
      width={440}
      footer={footer}
    >
      <div className={styles.body}>
        <p className={styles.question}>
          {problem ? `「${problem.title}」复习已完成，是否设置下次复习日期？` : ''}
        </p>
        <p className={styles.hint}>
          如果设置下次复习日期，状态将保持为「需复习」。如果不设置，状态将变更为「已完成」。
        </p>
        <FormField label="下次复习日期（可选）" htmlFor="review-next-date">
          <DatePicker
            id="review-next-date"
            value={nextReviewDate}
            onChange={setNextReviewDate}
          />
        </FormField>
      </div>
    </Modal>
  )
}
