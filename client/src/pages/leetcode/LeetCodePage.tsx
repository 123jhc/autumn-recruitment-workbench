import { useState, useCallback, useMemo } from 'react'
import type { LeetCodeProblem } from '@autumn-recruitment/shared'
import { useLeetCodeContext } from '../../contexts'
import { todayShanghai, weekRangeShanghai } from '../../hooks/use-date-utils'
import { ConfirmDialog, showToast } from '../../components'

import WeekStats from './components/WeekStats'
import ProblemFilters from './components/ProblemFilters'
import type { ProblemFilterValues } from './components/ProblemFilters'
import ProblemList from './components/ProblemList'
import ProblemForm from './components/ProblemForm'
import ReviewAction from './components/ReviewAction'

import styles from './LeetCodePage.module.css'

export default function LeetCodePage() {
  const {
    state,
    createProblem,
    updateProblem,
    deleteProblem,
    completeReview,
    setFilters,
  } = useLeetCodeContext()
  const { problems, loading, filters } = state

  // Form drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingProblem, setEditingProblem] = useState<LeetCodeProblem | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<LeetCodeProblem | null>(null)

  // Review modal
  const [reviewTarget, setReviewTarget] = useState<LeetCodeProblem | null>(null)

  // Week stats
  const today = useMemo(() => todayShanghai(), [])
  const weekRange = useMemo(() => weekRangeShanghai(today), [today])

  const handleNew = useCallback(() => {
    setEditingProblem(null)
    setDrawerOpen(true)
  }, [])

  const handleEdit = useCallback((problem: LeetCodeProblem) => {
    setEditingProblem(problem)
    setDrawerOpen(true)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false)
    setEditingProblem(null)
  }, [])

  const handleSave = useCallback(
    async (input: Omit<LeetCodeProblem, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (editingProblem) {
        await updateProblem(editingProblem.id, input)
        showToast('success', '题目已更新')
      } else {
        await createProblem(input)
        showToast('success', '题目已创建')
      }
    },
    [editingProblem, createProblem, updateProblem],
  )

  const handleDeleteRequest = useCallback((problem: LeetCodeProblem) => {
    setDeleteTarget(problem)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteProblem(deleteTarget.id)
      showToast('success', '题目已删除')
    } catch {
      showToast('error', '删除失败，请重试')
    } finally {
      setDeleteTarget(null)
    }
  }, [deleteTarget, deleteProblem])

  const handleReviewRequest = useCallback((problem: LeetCodeProblem) => {
    setReviewTarget(problem)
  }, [])

  const handleReviewComplete = useCallback(
    async (id: string, newReviewDate?: string) => {
      await completeReview(id, newReviewDate)
      showToast('success', '复习已完成')
    },
    [completeReview],
  )

  const handleFiltersChange = useCallback(
    (newFilters: ProblemFilterValues) => {
      setFilters(newFilters)
    },
    [setFilters],
  )

  // Compute solved this week from the full list (context method)
  const solvedThisWeek = useMemo(
    () =>
      problems.filter(
        (p) =>
          (p.status === 'solved' || p.status === 'review') &&
          p.solvedDate != null &&
          p.solvedDate >= weekRange.start &&
          p.solvedDate <= weekRange.end,
      ),
    [problems, weekRange],
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>LeetCode</h1>
        <button
          type="button"
          className={styles.addButton}
          onClick={handleNew}
        >
          + 新增题目
        </button>
      </div>

      <WeekStats solvedThisWeek={solvedThisWeek} />

      <div className={styles.toolbar}>
        <ProblemFilters
          filters={filters}
          onChange={handleFiltersChange}
        />
      </div>

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : (
        <ProblemList
          problems={problems}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onReview={handleReviewRequest}
        />
      )}

      <ProblemForm
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        onSave={handleSave}
        problem={editingProblem}
      />

      <ConfirmDialog
        isOpen={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="删除题目"
        message={deleteTarget ? `确定要删除题目「${deleteTarget.title}」吗？此操作不可撤销。` : ''}
        confirmLabel="删除"
        confirmVariant="danger"
      />

      <ReviewAction
        isOpen={reviewTarget != null}
        onClose={() => setReviewTarget(null)}
        problem={reviewTarget}
        onComplete={handleReviewComplete}
      />
    </div>
  )
}
