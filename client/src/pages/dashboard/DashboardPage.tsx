import { useEffect, useState, useMemo } from 'react'
import { useTaskContext, useApplicationContext, useLeetCodeContext } from '../../contexts'
import { todayShanghai, weekRangeShanghai, isOverdue } from '../../hooks/use-date-utils'
import { ToastContainer } from '../../components'
import WeekProgress from './components/WeekProgress'
import TodayTasks from './components/TodayTasks'
import OverdueTasks from './components/OverdueTasks'
import NextActions from './components/NextActions'
import ReviewReminders from './components/ReviewReminders'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const { state: taskState, setView, loadTasks } = useTaskContext()
  const { state: appState, loadApplications } = useApplicationContext()
  const { state: lcState, getReviewDue, loadProblems } = useLeetCodeContext()

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Force load all tasks for the dashboard
  useEffect(() => {
    setView('all')
  }, [setView])

  // Trigger reload when view changes to 'all'
  useEffect(() => {
    if (taskState.view === 'all') {
      loadTasks()
    }
  }, [taskState.view, loadTasks])

  // Load applications and problems on mount
  useEffect(() => {
    loadApplications()
    loadProblems()
  }, [loadApplications, loadProblems])

  // Track last update time
  useEffect(() => {
    if (!taskState.loading && !appState.loading && !lcState.loading) {
      setLastUpdated(new Date())
    }
  }, [taskState.loading, appState.loading, lcState.loading])

  const today = todayShanghai()
  const weekRange = useMemo(() => weekRangeShanghai(today), [today])

  // -- Task filtering --
  const todayTasks = useMemo(() => {
    return taskState.tasks.filter(
      (t) => t.plannedDate === today || t.dueDate === today,
    )
  }, [taskState.tasks, today])

  const overdueTasks = useMemo(() => {
    return taskState.tasks.filter(
      (t) => t.status === 'todo' && isOverdue(t.dueDate, today),
    )
  }, [taskState.tasks, today])

  // Week progress: tasks planned/due this week, completed this week
  const weekStats = useMemo(() => {
    const tasksThisWeek = taskState.tasks.filter(
      (t) =>
        (t.plannedDate != null && t.plannedDate >= weekRange.start && t.plannedDate <= weekRange.end) ||
        (t.dueDate != null && t.dueDate >= weekRange.start && t.dueDate <= weekRange.end),
    )
    const completedThisWeek = tasksThisWeek.filter(
      (t) =>
        t.status === 'done' &&
        t.completedAt != null &&
        t.completedAt.slice(0, 10) >= weekRange.start &&
        t.completedAt.slice(0, 10) <= weekRange.end,
    )
    return {
      total: tasksThisWeek.length,
      completed: completedThisWeek.length,
    }
  }, [taskState.tasks, weekRange])

  // -- Application filtering: nextActionDate within next 7 days --
  const upcomingApps = useMemo(() => {
    const sevenDaysLater = new Date(today + 'T00:00:00+08:00')
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
    const cutoff = sevenDaysLater.toISOString().slice(0, 10)

    return appState.applications
      .filter(
        (app) =>
          app.nextAction != null &&
          app.nextActionDate != null &&
          app.nextActionDate <= cutoff,
      )
      .sort((a, b) => {
        if (!a.nextActionDate) return 1
        if (!b.nextActionDate) return -1
        return a.nextActionDate.localeCompare(b.nextActionDate)
      })
  }, [appState.applications, today])

  // -- LeetCode review due --
  const reviewProblems = useMemo(() => getReviewDue(today), [getReviewDue, today])

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>今日总览</h1>
          <span className={styles.date}>{today}</span>
        </div>
      </header>

      {/* Progress summary */}
      <section>
        <WeekProgress
          total={weekStats.total}
          completed={weekStats.completed}
          weekLabel={`${weekRange.start} ~ ${weekRange.end}`}
        />
      </section>

      {/* Two-column layout for tasks / overdue */}
      <div className={styles.grid}>
        <div>
          <TodayTasks tasks={todayTasks} loading={taskState.loading} />
        </div>
        <div>
          <OverdueTasks tasks={overdueTasks} loading={taskState.loading} />
        </div>
      </div>

      {/* Full-width sections */}
      <div className={styles.fullWidth}>
        <NextActions applications={upcomingApps} loading={appState.loading} />
      </div>
      <div className={styles.fullWidth}>
        <ReviewReminders problems={reviewProblems} loading={lcState.loading} />
      </div>

      {/* Last updated timestamp */}
      {lastUpdated && (
        <div className={styles.lastUpdated}>
          上次更新: {formatTime(lastUpdated)}
        </div>
      )}

      <ToastContainer />
    </div>
  )
}
