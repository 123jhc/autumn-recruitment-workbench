import { useEffect, useMemo, useState } from 'react'
import type { LeetCodeProblem, LeetCodeSchedule } from '@autumn-recruitment/shared'
import { Button, DatePicker, FormField, Modal } from '../../../components'
import type { ScheduleConfigInput } from '../../../dal/leetcode.dal'
import { HOT_100_LIST_ID, HOT_100_PROBLEMS, HOT_100_TOPICS } from '../../../features/leetcode/hot100'
import { buildSchedule } from '../../../features/leetcode/planning'
import { todayShanghai } from '../../../hooks/use-date-utils'
import styles from './PlanSetupModal.module.css'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (config: ScheduleConfigInput) => Promise<void>
  existingProblems: LeetCodeProblem[]
  schedule?: LeetCodeSchedule
  mode?: 'initialize' | 'reschedule'
}

const WEEKDAYS = [
  { value: 1, label: '周一' }, { value: 2, label: '周二' }, { value: 3, label: '周三' },
  { value: 4, label: '周四' }, { value: 5, label: '周五' }, { value: 6, label: '周六' }, { value: 7, label: '周日' },
]

export default function PlanSetupModal({
  isOpen, onClose, onConfirm, existingProblems, schedule, mode = 'initialize',
}: Props) {
  const [startDate, setStartDate] = useState(todayShanghai())
  const [endDate, setEndDate] = useState(() => addDays(todayShanghai(), 89))
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5])
  const [previewing, setPreviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setStartDate(schedule?.startDate ?? todayShanghai())
    setEndDate(schedule?.endDate ?? addDays(todayShanghai(), 89))
    setWeekdays(schedule?.weekdays ?? [1, 2, 3, 4, 5])
    setPreviewing(false)
    setError('')
  }, [isOpen, schedule])

  const preview = useMemo(() => {
    if (!previewing) return undefined
    const existingBySlug = new Map(existingProblems.map((problem) => [problem.slug, problem]))
    const existingByNumber = new Map(existingProblems.filter((problem) => problem.number).map((problem) => [problem.number!, problem]))
    const rows = HOT_100_PROBLEMS.map((problem) => {
      const existing = existingBySlug.get(problem.slug) ?? existingByNumber.get(problem.number)
      return { slug: problem.slug, status: existing?.status === 'todo' || !existing ? 'todo' as const : 'solved' as const, queueOrder: problem.recommendedOrder }
    })
    const assignments = buildSchedule({ problems: rows, startDate, endDate, weekdays })
    const daily = new Map<string, number>()
    for (const assignment of assignments) daily.set(assignment.plannedDate, (daily.get(assignment.plannedDate) ?? 0) + 1)
    const matched = HOT_100_PROBLEMS.filter((problem) => existingBySlug.has(problem.slug) || existingByNumber.has(problem.number)).length
    const loads = [...daily.values()]
    return {
      matched,
      added: 100 - matched,
      studyDays: daily.size,
      minDaily: loads.length ? Math.min(...loads) : 0,
      maxDaily: loads.length ? Math.max(...loads) : 0,
    }
  }, [previewing, existingProblems, startDate, endDate, weekdays])

  const handlePreview = () => {
    setError('')
    try {
      detectConflict(existingProblems)
      buildSchedule({
        problems: HOT_100_PROBLEMS.map((problem) => ({ slug: problem.slug, status: 'todo', queueOrder: problem.recommendedOrder })),
        startDate, endDate, weekdays,
      })
      setPreviewing(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法生成计划')
    }
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    setError('')
    try {
      await onConfirm({ listId: HOT_100_LIST_ID, startDate, endDate, weekdays })
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存计划失败')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleWeekday = (value: number) => {
    setWeekdays((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value].sort())
    setPreviewing(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'initialize' ? '初始化热题 100' : '重新排期未完成题目'}
      width={680}
      footer={<div className={styles.footer}>
        <Button onClick={onClose}>取消</Button>
        {!previewing ? (
          <Button variant="primary" onClick={handlePreview}>预览计划</Button>
        ) : (
          <Button variant="primary" loading={submitting} onClick={handleConfirm}>
            {mode === 'initialize' ? '导入并生成计划' : '确认重新排期'}
          </Button>
        )}
      </div>}
    >
      <div className={styles.formGrid}>
        <FormField label="开始日期" required><DatePicker value={startDate} onChange={(value) => { setStartDate(value); setPreviewing(false) }} /></FormField>
        <FormField label="截止日期" required><DatePicker value={endDate} min={startDate} onChange={(value) => { setEndDate(value); setPreviewing(false) }} /></FormField>
      </div>
      <div className={styles.fieldLabel}>每周刷题日</div>
      <div className={styles.weekdays}>
        {WEEKDAYS.map((weekday) => (
          <label key={weekday.value} className={styles.weekday}>
            <input type="checkbox" checked={weekdays.includes(weekday.value)} onChange={() => toggleWeekday(weekday.value)} />
            {weekday.label}
          </label>
        ))}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {preview && <div className={styles.preview}>
        <div className={styles.summary}>
          <strong>{mode === 'initialize' ? `待新增 ${preview.added} 题` : '仅重排未完成题'}</strong>
          {mode === 'initialize' && <span>，匹配并保留进度 {preview.matched} 题</span>}
          <span>；{preview.studyDays} 个刷题日，每日 {preview.minDaily}–{preview.maxDaily} 题</span>
        </div>
        {mode === 'initialize' && <div className={styles.topicGrid}>
          {HOT_100_TOPICS.map((topic) => (
            <span key={topic}>{topic} {HOT_100_PROBLEMS.filter((problem) => problem.topic === topic).length} 题</span>
          ))}
        </div>}
      </div>}
    </Modal>
  )
}

function addDays(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

function detectConflict(existing: LeetCodeProblem[]): void {
  for (const seed of HOT_100_PROBLEMS) {
    const slugMatch = existing.find((problem) => problem.slug === seed.slug)
    const numberMatch = existing.find((problem) => problem.number === seed.number)
    if (slugMatch && numberMatch && slugMatch.slug !== numberMatch.slug) {
      throw new Error(`题号或 slug 冲突：#${seed.number} ${seed.title}`)
    }
  }
}
