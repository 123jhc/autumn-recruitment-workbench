import { useTaskContext } from '../../../contexts'
import { TASK_CATEGORIES, TASK_PRIORITIES } from '@autumn-recruitment/shared'
import { Select } from '../../../components'
import type { TaskCategory, TaskStatus } from '@autumn-recruitment/shared'
import styles from './TaskFilters.module.css'

const VIEW_TABS: { value: 'today' | 'week' | 'all' | 'completed'; label: string }[] = [
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'all', label: '全部' },
  { value: 'completed', label: '已完成' },
]

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'todo', label: '待完成' },
  { value: 'done', label: '已完成' },
]

export default function TaskFilters() {
  const { state, setView, setFilter } = useTaskContext()
  const { view, filter } = state

  return (
    <div className={styles.bar}>
      <div className={styles.tabs}>
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`${styles.tab} ${view === tab.value ? styles.tabActive : ''}`}
            onClick={() => setView(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.filters}>
        <div className={styles.filterItem}>
          <Select
            options={[{ value: '', label: '全部分类' }, ...TASK_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))]}
            value={filter.category ?? ''}
            onChange={(v) => setFilter({ category: (v || undefined) as TaskCategory | undefined })}
          />
        </div>
        <div className={styles.filterItem}>
          <Select
            options={STATUS_OPTIONS}
            value={filter.status ?? ''}
            onChange={(v) => setFilter({ status: (v || undefined) as TaskStatus | undefined })}
          />
        </div>
      </div>
    </div>
  )
}
