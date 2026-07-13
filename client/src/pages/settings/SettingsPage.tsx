import { ToastContainer } from '../../components'
import AiStatus from './components/AiStatus'
import ExportSection from './components/ExportSection'
import ImportSection from './components/ImportSection'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>设置</h1>
      <AiStatus />
      <ExportSection />
      <ImportSection />
      <ToastContainer />
    </div>
  )
}
