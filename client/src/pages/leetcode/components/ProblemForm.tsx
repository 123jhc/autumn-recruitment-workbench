import { useState, useEffect } from 'react'
import type { LeetCodeProblem, Difficulty, ProblemStatus } from '@autumn-recruitment/shared'
import { DIFFICULTIES, PROBLEM_STATUSES } from '@autumn-recruitment/shared'
import Drawer from '../../../components/Drawer'
import FormField from '../../../components/FormField'
import Select from '../../../components/Select'
import DatePicker from '../../../components/DatePicker'
import Button from '../../../components/Button'
import styles from './ProblemForm.module.css'

interface ProblemFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (input: Omit<LeetCodeProblem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  problem?: LeetCodeProblem | null
}

const EMPTY_FORM: Omit<LeetCodeProblem, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  difficulty: 'easy',
  tags: [],
  status: 'todo',
}

export default function ProblemForm({ isOpen, onClose, onSave, problem }: ProblemFormProps) {
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [number, setNumber] = useState<number | undefined>(undefined)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [tagsText, setTagsText] = useState('')
  const [status, setStatus] = useState<ProblemStatus>('todo')
  const [solutionSummary, setSolutionSummary] = useState('')
  const [solvedDate, setSolvedDate] = useState('')
  const [reviewDate, setReviewDate] = useState('')

  // Reset form when opening or when problem changes
  useEffect(() => {
    if (isOpen) {
      if (problem) {
        setNumber(problem.number)
        setTitle(problem.title)
        setUrl(problem.url ?? '')
        setDifficulty(problem.difficulty)
        setTagsText(problem.tags.join(', '))
        setStatus(problem.status)
        setSolutionSummary(problem.solutionSummary ?? '')
        setSolvedDate(problem.solvedDate ?? '')
        setReviewDate(problem.reviewDate ?? '')
      } else {
        setNumber(undefined)
        setTitle('')
        setUrl('')
        setDifficulty('easy')
        setTagsText('')
        setStatus('todo')
        setSolutionSummary('')
        setSolvedDate('')
        setReviewDate('')
      }
      setErrors({})
      setSaving(false)
    }
  }, [isOpen, problem])

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!title.trim()) {
      errs.title = '题目标题不能为空'
    }
    if (url && !isValidUrl(url)) {
      errs.url = '请输入有效的 URL'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    const input: Omit<LeetCodeProblem, 'id' | 'createdAt' | 'updatedAt'> = {
      number: number != null && !isNaN(number) ? number : undefined,
      title: title.trim(),
      url: url.trim() || undefined,
      difficulty,
      tags,
      status,
      solutionSummary: solutionSummary.trim() || undefined,
      solvedDate: solvedDate || undefined,
      reviewDate: reviewDate || undefined,
    }

    setSaving(true)
    try {
      await onSave(input)
      onClose()
    } catch (err) {
      // Error handled by caller
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={problem ? '编辑题目' : '新增题目'}
      width={520}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <FormField label="题号" htmlFor="problem-number">
          <input
            id="problem-number"
            type="number"
            className={styles.input}
            value={number ?? ''}
            onChange={(e) => setNumber(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="例如: 1"
            min={1}
          />
        </FormField>

        <FormField label="标题" required htmlFor="problem-title" error={errors.title}>
          <input
            id="problem-title"
            type="text"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如: Two Sum"
          />
        </FormField>

        <FormField label="题目链接" htmlFor="problem-url" error={errors.url}>
          <input
            id="problem-url"
            type="url"
            className={styles.input}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://leetcode.cn/problems/two-sum/"
          />
        </FormField>

        <FormField label="难度" required htmlFor="problem-difficulty">
          <Select
            id="problem-difficulty"
            options={DIFFICULTIES.map((d) => ({ value: d.value, label: d.label }))}
            value={difficulty}
            onChange={(v) => setDifficulty(v as Difficulty)}
          />
        </FormField>

        <FormField label="标签" htmlFor="problem-tags">
          <input
            id="problem-tags"
            type="text"
            className={styles.input}
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="多个标签用逗号分隔，例如：数组, 哈希表, 双指针"
          />
        </FormField>

        <FormField label="状态" required htmlFor="problem-status">
          <Select
            id="problem-status"
            options={PROBLEM_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            value={status}
            onChange={(v) => setStatus(v as ProblemStatus)}
          />
        </FormField>

        <FormField label="解法摘要" htmlFor="problem-summary">
          <textarea
            id="problem-summary"
            className={styles.textarea}
            value={solutionSummary}
            onChange={(e) => setSolutionSummary(e.target.value)}
            placeholder="简要记录解题思路..."
            rows={3}
          />
        </FormField>

        <FormField label="完成日期" htmlFor="problem-solved-date">
          <DatePicker
            id="problem-solved-date"
            value={solvedDate}
            onChange={setSolvedDate}
          />
        </FormField>

        {(status === 'review') && (
          <FormField label="复习日期" htmlFor="problem-review-date">
            <DatePicker
              id="problem-review-date"
              value={reviewDate}
              onChange={setReviewDate}
            />
          </FormField>
        )}

        <div className={styles.formActions}>
          <Button type="button" variant="default" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {problem ? '保存' : '创建'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
