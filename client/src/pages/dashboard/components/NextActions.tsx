import { useState } from 'react'
import { Link } from 'react-router'
import type { Application } from '@autumn-recruitment/shared'
import { APPLICATION_STATUSES } from '@autumn-recruitment/shared'
import { useApplicationContext } from '../../../contexts'
import { todayShanghai, formatDate } from '../../../hooks/use-date-utils'
import { Badge, Button, showToast } from '../../../components'
import styles from './NextActions.module.css'

interface NextActionsProps {
  applications: Application[]
  loading: boolean
}

const STATUS_LABELS = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s.value, s.label]))

function statusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'offer': return 'success'
    case 'rejected': return 'danger'
    case 'interview':
    case 'assessment': return 'warning'
    case 'applied': return 'info'
    default: return 'default'
  }
}

export default function NextActions({ applications, loading }: NextActionsProps) {
  const { createNextActionTask } = useApplicationContext()
  const [creatingIds, setCreatingIds] = useState<Set<string>>(new Set())

  const today = todayShanghai()

  const handleCreateTask = async (app: Application) => {
    setCreatingIds((prev) => new Set(prev).add(app.id))
    try {
      await createNextActionTask(app.id)
      showToast('success', `已为 ${app.company} - ${app.role} 创建任务`)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '创建任务失败')
    } finally {
      setCreatingIds((prev) => {
        const next = new Set(prev)
        next.delete(app.id)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>岗位下一步行动</h2>
        </div>
        <p style={{ color: 'var(--color-text-disabled)', fontSize: 13 }}>加载中...</p>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>岗位下一步行动</h2>
        <Link to="/applications" className={styles.viewAll}>
          查看全部
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className={styles.emptyState}>未来 7 天没有待处理行动</div>
      ) : (
        <ul className={styles.list}>
          {applications.map((app) => {
            const isOverdue = app.nextActionDate != null && app.nextActionDate < today
            const isCreating = creatingIds.has(app.id)
            return (
              <li key={app.id} className={styles.item}>
                <div className={styles.info}>
                  <div className={styles.companyRole}>
                    {app.company} - {app.role}
                    <Badge variant={statusBadgeVariant(app.status)}>
                      {STATUS_LABELS[app.status] ?? app.status}
                    </Badge>
                  </div>
                  {app.nextAction && (
                    <div className={styles.actionText}>{app.nextAction}</div>
                  )}
                  {app.nextActionDate && (
                    <div className={`${styles.actionDate} ${isOverdue ? styles.actionDateOverdue : ''}`}>
                      {isOverdue ? '已逾期: ' : '计划: '}
                      {formatDate(app.nextActionDate)}
                    </div>
                  )}
                </div>
                <Button
                  size="small"
                  variant="primary"
                  loading={isCreating}
                  onClick={() => handleCreateTask(app)}
                >
                  生成任务
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
