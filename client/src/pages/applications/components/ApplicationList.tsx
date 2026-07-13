import type { Application } from '@autumn-recruitment/shared'
import { EmptyState } from '../../../components'
import ApplicationItem from './ApplicationItem'
import styles from './ApplicationList.module.css'

interface ApplicationListProps {
  applications: Application[]
  onEdit: (app: Application) => void
  onDelete: (app: Application) => void
  onNewApplication: () => void
}

export default function ApplicationList({
  applications,
  onEdit,
  onDelete,
  onNewApplication,
}: ApplicationListProps) {
  if (applications.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="暂无岗位"
        description="点击「新增岗位」开始记录你的目标岗位和投递进度"
        actionLabel="新增岗位"
        onAction={onNewApplication}
      />
    )
  }

  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <span className={styles.headerCell}>公司</span>
        <span className={styles.headerCell}>岗位</span>
        <span className={styles.headerCell}>状态</span>
        <span className={styles.headerCell}>地点</span>
        <span className={styles.headerCell}>投递日期</span>
        <span className={styles.headerCell}>下一步行动</span>
        <span className={styles.headerCell}>操作</span>
      </div>
      {applications.map((app) => (
        <ApplicationItem
          key={app.id}
          application={app}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
