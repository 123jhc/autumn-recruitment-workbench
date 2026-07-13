import type { Application, ApplicationStatus } from '@autumn-recruitment/shared'
import { APPLICATION_STATUSES } from '@autumn-recruitment/shared'
import { Badge, Button, showToast } from '../../../components'
import { useApplicationContext } from '../../../contexts'
import styles from './ApplicationItem.module.css'

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  target: '#1677ff',
  preparing: '#13c2c2',
  applied: '#fa8c16',
  assessment: '#722ed1',
  interview: '#d48806',
  offer: '#52c41a',
  rejected: '#f5222d',
}

const STATUS_VARIANT: Record<ApplicationStatus, 'info' | 'default' | 'warning' | 'success' | 'danger'> = {
  target: 'info',
  preparing: 'info',
  applied: 'warning',
  assessment: 'default',
  interview: 'warning',
  offer: 'success',
  rejected: 'danger',
}

function getStatusLabel(status: ApplicationStatus): string {
  return APPLICATION_STATUSES.find((s) => s.value === status)?.label ?? status
}

interface ApplicationItemProps {
  application: Application
  onEdit: (app: Application) => void
  onDelete: (app: Application) => void
}

export default function ApplicationItem({
  application,
  onEdit,
  onDelete,
}: ApplicationItemProps) {
  const { createNextActionTask } = useApplicationContext()

  const handleCreateTask = async () => {
    try {
      await createNextActionTask(application.id)
      showToast('success', '任务已创建')
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建任务失败'
      showToast('error', message)
    }
  }

  return (
    <div className={styles.item}>
      <span className={styles.company}>{application.company}</span>
      <span className={styles.role}>{application.role}</span>

      <span className={styles.badgeCell}>
        <Badge variant={STATUS_VARIANT[application.status]}>
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: STATUS_COLORS[application.status],
              marginRight: 4,
            }}
          />
          {getStatusLabel(application.status)}
        </Badge>
      </span>

      <span className={styles.location}>
        {application.location || <span className={styles.emptyCell}>--</span>}
      </span>

      <span className={styles.appliedDate}>
        {application.appliedDate || <span className={styles.emptyCell}>--</span>}
      </span>

      <div className={styles.nextAction}>
        {application.nextAction ? (
          <>
            <span className={styles.nextActionText}>{application.nextAction}</span>
            {application.nextActionDate && (
              <span className={styles.nextActionDate}>{application.nextActionDate}</span>
            )}
          </>
        ) : (
          <span className={styles.emptyCell}>--</span>
        )}
      </div>

      <div className={styles.actions}>
        {application.nextAction && (
          <Button
            variant="text"
            size="small"
            className={styles.createTaskButton}
            onClick={handleCreateTask}
          >
            生成任务
          </Button>
        )}
        <Button
          variant="text"
          size="small"
          onClick={() => onEdit(application)}
        >
          编辑
        </Button>
        <Button
          variant="text"
          size="small"
          onClick={() => onDelete(application)}
        >
          删除
        </Button>
      </div>
    </div>
  )
}
