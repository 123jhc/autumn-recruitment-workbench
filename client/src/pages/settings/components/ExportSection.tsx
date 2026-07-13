import { useSettingsContext } from '../../../contexts'
import { Button, showToast } from '../../../components'
import styles from './ExportSection.module.css'

export default function ExportSection() {
  const { exportBackup } = useSettingsContext()

  const handleExport = async () => {
    try {
      await exportBackup()
      showToast('success', '数据导出成功')
    } catch {
      showToast('error', '导出失败，请重试')
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>数据导出</h2>
      <p className={styles.sectionDesc}>
        将所有数据（任务、岗位、LeetCode 记录等）导出为 JSON 文件，可用于备份或迁移。
      </p>
      <Button onClick={handleExport}>导出备份</Button>
      <p className={styles.note}>API Key 不会包含在备份中</p>
    </section>
  )
}
