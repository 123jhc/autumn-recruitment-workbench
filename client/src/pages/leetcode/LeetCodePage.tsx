import { useState, useCallback, useMemo } from 'react'
import type { LeetCodeProblem } from '@autumn-recruitment/shared'
import type { LeetCodeProblemInput, ScheduleConfigInput } from '../../dal/leetcode.dal'
import { useLeetCodeContext } from '../../contexts'
import { todayShanghai, weekRangeShanghai } from '../../hooks/use-date-utils'
import { Button, ConfirmDialog, EmptyState, showToast } from '../../components'
import { HOT_100_TOPICS } from '../../features/leetcode/hot100'

import WeekStats from './components/WeekStats'
import ProblemFilters from './components/ProblemFilters'
import type { ProblemFilterValues } from './components/ProblemFilters'
import ProblemList from './components/ProblemList'
import ProblemForm from './components/ProblemForm'
import ReviewAction from './components/ReviewAction'
import PlanSetupModal from './components/PlanSetupModal'
import styles from './LeetCodePage.module.css'

type PageView = 'today' | 'all' | 'topics'

export default function LeetCodePage() {
  const {
    state, filteredProblems, createProblem, updateProblem, deleteProblem, completeProblem,
    completeReview, initializeHot100, reschedule, moveProblem, setFilters,
  } = useLeetCodeContext()
  const { problems, schedule, loading, filters } = state
  const [view, setView] = useState<PageView>('today')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingProblem, setEditingProblem] = useState<LeetCodeProblem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LeetCodeProblem | null>(null)
  const [reviewTarget, setReviewTarget] = useState<LeetCodeProblem | null>(null)
  const [planModal, setPlanModal] = useState<'initialize' | 'reschedule' | null>(null)
  const today = useMemo(() => todayShanghai(), [])
  const weekRange = useMemo(() => weekRangeShanghai(today), [today])

  const handleNew = useCallback(() => { setEditingProblem(null); setDrawerOpen(true) }, [])
  const handleEdit = useCallback((problem: LeetCodeProblem) => { setEditingProblem(problem); setDrawerOpen(true) }, [])
  const handleCloseDrawer = useCallback(() => { setDrawerOpen(false); setEditingProblem(null) }, [])
  const handleSave = useCallback(async (input: LeetCodeProblemInput) => {
    if (editingProblem) {
      await updateProblem(editingProblem.slug, input)
      showToast('success', '题目已更新')
    } else {
      await createProblem(input)
      showToast('success', '题目已创建')
    }
  }, [editingProblem, createProblem, updateProblem])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteProblem(deleteTarget.slug)
      showToast('success', '题目已删除')
    } catch { showToast('error', '删除失败，请重试') }
    finally { setDeleteTarget(null) }
  }, [deleteTarget, deleteProblem])

  const handleComplete = useCallback(async (problem: LeetCodeProblem) => {
    try {
      await completeProblem(problem.slug, todayShanghai())
      showToast('success', `已完成：#${problem.number ?? '-'} ${problem.title}`)
    } catch (error) { showToast('error', error instanceof Error ? error.message : '完成失败') }
  }, [completeProblem])

  const handleMove = useCallback(async (problem: LeetCodeProblem, direction: -1 | 1) => {
    try { await moveProblem(problem.slug, direction, todayShanghai()) }
    catch (error) { showToast('error', error instanceof Error ? error.message : '调整顺序失败') }
  }, [moveProblem])

  const handlePlanConfirm = useCallback(async (config: ScheduleConfigInput) => {
    if (planModal === 'reschedule') {
      await reschedule(config)
      showToast('success', '未完成题目已重新排期')
    } else {
      const result = await initializeHot100(config)
      showToast('success', `热题 100 已初始化：新增 ${result.added} 题，保留 ${result.matched} 题进度`)
    }
  }, [planModal, initializeHot100, reschedule])

  const solvedThisWeek = useMemo(() => problems.filter((problem) =>
    problem.solvedDate != null && problem.solvedDate >= weekRange.start && problem.solvedDate <= weekRange.end,
  ), [problems, weekRange])

  const visibleProblems = useMemo(() => view === 'today'
    ? filteredProblems.filter((problem) => problem.plannedDate === today)
    : filteredProblems,
  [filteredProblems, today, view])

  const topicGroups = useMemo(() => {
    const topics = [...HOT_100_TOPICS, '其他题目']
    return topics.map((topic) => ({
      topic,
      problems: visibleProblems.filter((problem) => (problem.topic ?? '其他题目') === topic),
    })).filter((group) => group.problems.length > 0)
  }, [visibleProblems])

  if (loading) return <div className={styles.loading}>加载中...</div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>LeetCode</h1>
          {schedule && <p className={styles.scheduleMeta}>{schedule.startDate} 至 {schedule.endDate} · 热题 100</p>}
        </div>
        <div className={styles.headerActions}>
          {schedule && <Button onClick={() => setPlanModal('reschedule')}>重新排期</Button>}
          {!schedule && problems.length > 0 && <Button variant="primary" onClick={() => setPlanModal('initialize')}>初始化热题 100</Button>}
          <Button onClick={handleNew}>+ 新增题目</Button>
        </div>
      </div>

      {!schedule && problems.length === 0 ? (
        <div className={styles.initializeCard}>
          <EmptyState icon="🔥" title="加载热题 100，按专题开始刷题" description="选择计划周期和每周刷题日，确认预览后自动生成每日计划。" />
          <Button variant="primary" onClick={() => setPlanModal('initialize')}>初始化热题 100</Button>
        </div>
      ) : (
        <>
          <WeekStats solvedThisWeek={solvedThisWeek} />
          <div className={styles.tabs} role="tablist" aria-label="题目视图">
            {([['today', '今日计划'], ['all', '全部题目'], ['topics', '按专题']] as const).map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={view === value} className={`${styles.tab} ${view === value ? styles.tabActive : ''}`} onClick={() => setView(value)}>{label}</button>
            ))}
          </div>
          <div className={styles.toolbar}>
            <ProblemFilters filters={filters} onChange={(next: ProblemFilterValues) => setFilters(next)} />
          </div>

          {view === 'topics' ? topicGroups.map((group) => (
            <section key={group.topic} className={styles.topicSection}>
              <h2 className={styles.topicTitle}>{group.topic}<span>{group.problems.length} 题</span></h2>
              <ProblemList problems={group.problems} onEdit={handleEdit} onDelete={setDeleteTarget} onReview={setReviewTarget} onComplete={handleComplete} onMove={handleMove} />
            </section>
          )) : (
            <ProblemList problems={visibleProblems} onEdit={handleEdit} onDelete={setDeleteTarget} onReview={setReviewTarget} onComplete={handleComplete} onMove={handleMove} />
          )}
        </>
      )}

      <ProblemForm isOpen={drawerOpen} onClose={handleCloseDrawer} onSave={handleSave} problem={editingProblem} />
      <ConfirmDialog isOpen={deleteTarget != null} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm} title="删除题目" message={deleteTarget ? `确定要删除题目「${deleteTarget.title}」吗？此操作不可撤销。` : ''} confirmLabel="删除" confirmVariant="danger" />
      <ReviewAction isOpen={reviewTarget != null} onClose={() => setReviewTarget(null)} problem={reviewTarget} onComplete={async (slug, date) => { await completeReview(slug, date); showToast('success', '复习已完成') }} />
      <PlanSetupModal isOpen={planModal != null} onClose={() => setPlanModal(null)} onConfirm={handlePlanConfirm} existingProblems={problems} schedule={schedule} mode={planModal ?? 'initialize'} />
    </div>
  )
}
