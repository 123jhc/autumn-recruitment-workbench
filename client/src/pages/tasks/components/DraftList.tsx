import { useState } from 'react'
import type { TaskDraft } from '@autumn-recruitment/shared'
import { taskDraftDal } from '../../../dal/task-draft.dal'
import { Button, showToast } from '../../../components'
import DraftItem from './DraftItem'
import DraftEditor from './DraftEditor'
import styles from './DraftList.module.css'

interface DraftListProps {
  importId: string
  drafts: TaskDraft[]
  onDraftsUpdate: (drafts: TaskDraft[]) => void
  onConfirm: () => void
  onCancel: () => void
}

export default function DraftList({
  importId,
  drafts,
  onDraftsUpdate,
  onConfirm,
  onCancel,
}: DraftListProps) {
  const [confirming, setConfirming] = useState(false)
  const [editingDraft, setEditingDraft] = useState<TaskDraft | null>(null)

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await taskDraftDal.confirmDrafts(importId)
      showToast('success', `已创建 ${drafts.length} 个任务`)
      onConfirm()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '确认失败')
    } finally {
      setConfirming(false)
    }
  }

  const handleDeleteDraft = async (id: string) => {
    try {
      await taskDraftDal.delete(id)
      const updated = drafts.filter((d) => d.id !== id)
      onDraftsUpdate(updated)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleEditDraft = (draft: TaskDraft) => {
    setEditingDraft(draft)
  }

  const handleSaveDraft = async (id: string, patch: Partial<Omit<TaskDraft, 'id' | 'importId'>>) => {
    try {
      const updated = await taskDraftDal.update(id, patch)
      const newDrafts = drafts.map((d) => (d.id === id ? updated : d))
      onDraftsUpdate(newDrafts)
      setEditingDraft(null)
      showToast('success', '草稿已更新')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '更新失败')
    }
  }

  if (drafts.length === 0) {
    return (
      <div className={styles.empty}>
        <p>没有可确认的草稿</p>
        <Button variant="default" size="small" onClick={onCancel}>
          关闭
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.headerTitle}>任务草稿 ({drafts.length})</h4>
        <span className={styles.headerHint}>
          确认前可编辑或删除草稿
        </span>
      </div>

      <div className={styles.list}>
        {drafts.map((draft) =>
          editingDraft?.id === draft.id ? (
            <DraftEditor
              key={draft.id}
              draft={draft}
              onSave={handleSaveDraft}
              onCancel={() => setEditingDraft(null)}
            />
          ) : (
            <DraftItem
              key={draft.id}
              draft={draft}
              onEdit={handleEditDraft}
              onDelete={handleDeleteDraft}
            />
          ),
        )}
      </div>

      <div className={styles.footer}>
        <Button variant="default" onClick={onCancel} disabled={confirming}>
          取消
        </Button>
        <Button variant="primary" onClick={handleConfirm} loading={confirming}>
          确认全部
        </Button>
      </div>
    </div>
  )
}
