import { Button, Select } from '../../../components'
import { APPLICATION_STATUSES, type ApplicationStatus } from '@autumn-recruitment/shared'
import styles from './ApplicationFilters.module.css'

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  ...APPLICATION_STATUSES.map((s) => ({ value: s.value, label: s.label })),
]

interface ApplicationFiltersProps {
  searchQuery: string
  filterStatus: ApplicationStatus | null
  onSearchChange: (query: string) => void
  onStatusChange: (status: ApplicationStatus | null) => void
  onClear: () => void
}

export default function ApplicationFilters({
  searchQuery,
  filterStatus,
  onSearchChange,
  onStatusChange,
  onClear,
}: ApplicationFiltersProps) {
  const hasFilters = searchQuery !== '' || filterStatus !== null

  return (
    <div className={styles.filters}>
      <input
        type="text"
        className={styles.searchInput}
        placeholder="搜索公司或岗位..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className={styles.statusSelect}>
        <Select
          options={STATUS_OPTIONS}
          value={filterStatus ?? ''}
          onChange={(value) => onStatusChange(value === '' ? null : value as ApplicationStatus)}
        />
      </div>
      {hasFilters && (
        <Button
          variant="text"
          size="small"
          className={styles.clearButton}
          onClick={onClear}
        >
          清除筛选
        </Button>
      )}
    </div>
  )
}
