import type { Difficulty, ProblemStatus } from '@autumn-recruitment/shared'
import { DIFFICULTIES, PROBLEM_STATUSES } from '@autumn-recruitment/shared'
import Select from '../../../components/Select'
import Button from '../../../components/Button'
import styles from './ProblemFilters.module.css'
import { HOT_100_TOPICS } from '../../../features/leetcode/hot100'

export interface ProblemFilterValues {
  difficulty?: Difficulty
  tag?: string
  status?: ProblemStatus
  topic?: string
}

interface ProblemFiltersProps {
  filters: ProblemFilterValues
  onChange: (filters: ProblemFilterValues) => void
}

const ALL_DIFFICULTY = ''
const ALL_STATUS = ''

export default function ProblemFilters({ filters, onChange }: ProblemFiltersProps) {
  const hasFilters = filters.difficulty || filters.tag || filters.status

  const handleClear = () => {
    onChange({})
  }

  return (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>专题</label>
        <Select
          options={[
            { value: '', label: '全部专题' },
            ...HOT_100_TOPICS.map((topic) => ({ value: topic, label: topic })),
          ]}
          value={filters.topic ?? ''}
          onChange={(value) => onChange({ ...filters, topic: value || undefined })}
        />
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>难度</label>
        <Select
          options={[
            { value: ALL_DIFFICULTY, label: '全部难度' },
            ...DIFFICULTIES.map((d) => ({ value: d.value, label: d.label })),
          ]}
          value={filters.difficulty ?? ALL_DIFFICULTY}
          onChange={(v) => onChange({ ...filters, difficulty: (v || undefined) as Difficulty | undefined })}
        />
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>状态</label>
        <Select
          options={[
            { value: ALL_STATUS, label: '全部状态' },
            ...PROBLEM_STATUSES.map((s) => ({ value: s.value, label: s.label })),
          ]}
          value={filters.status ?? ALL_STATUS}
          onChange={(v) => onChange({ ...filters, status: (v || undefined) as ProblemStatus | undefined })}
        />
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>标签搜索</label>
        <input
          type="text"
          className={styles.tagInput}
          value={filters.tag ?? ''}
          onChange={(e) => onChange({ ...filters, tag: e.target.value || undefined })}
          placeholder="输入标签关键词..."
        />
      </div>

      {hasFilters && (
        <Button size="small" variant="text" onClick={handleClear}>
          清除筛选
        </Button>
      )}
    </div>
  )
}
