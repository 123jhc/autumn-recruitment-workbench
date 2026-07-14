import { useState, useRef } from 'react'
import { BackupEnvelopeSchema } from '@autumn-recruitment/shared'
import { backupDal } from '../../../dal/backup.dal'
import { Button, showToast } from '../../../components'
import type { BackupEnvelope } from '@autumn-recruitment/shared'
import styles from './ImportSection.module.css'

type ImportState = 'idle' | 'validating' | 'showing-summary' | 'restoring' | 'done'

export default function ImportSection() {
  const [importState, setImportState] = useState<ImportState>('idle')
  const [envelope, setEnvelope] = useState<BackupEnvelope | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setImportState('idle')
    setEnvelope(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setImportState('validating')

    try {
      const text = await file.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        setError('文件不是有效的 JSON 格式，请检查文件内容。')
        setImportState('idle')
        return
      }

      const result = BackupEnvelopeSchema.safeParse(parsed)
      if (!result.success) {
        const messages = result.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('；')
        setError(`备份文件格式校验失败：${messages}`)
        setImportState('idle')
        return
      }

      setEnvelope(result.data)
      setImportState('showing-summary')
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件读取失败，请重试。')
      setImportState('idle')
    }
  }

  const handleRestore = async () => {
    if (!envelope) return
    setImportState('restoring')
    try {
      await backupDal.importBackup(envelope)
      setImportState('done')
      showToast('success', '数据恢复成功')
    } catch {
      showToast('error', '恢复失败，原数据未受影响')
      setImportState('showing-summary')
    }
  }

  const data = envelope?.data

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>数据恢复</h2>
      <p className={styles.sectionDesc}>
        从之前导出的 JSON 备份文件恢复所有数据。恢复前会显示数据摘要，确认后将替换当前所有数据。
      </p>

      {importState === 'idle' && (
        <div className={styles.idleBox}>
          <label className={styles.fileLabel}>
            选择备份文件
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className={styles.fileInput}
            />
          </label>
          {error && (
            <div className={styles.errorBox}>
              <p className={styles.errorTitle}>校验失败</p>
              <p className={styles.errorMessage}>{error}</p>
              <Button variant="default" size="small" onClick={resetState}>
                重新选择
              </Button>
            </div>
          )}
        </div>
      )}

      {importState === 'validating' && (
        <div className={styles.stateBox}>
          <p className={styles.stateText}>正在验证备份文件...</p>
        </div>
      )}

      {importState === 'showing-summary' && envelope && data && (
        <div className={styles.summaryBox}>
          <h3 className={styles.summaryTitle}>备份摘要</h3>
          <ul className={styles.summaryList}>
            <li>
              <span className={styles.entityLabel}>任务</span>
              <span className={styles.entityCount}>{data.tasks.length} 条</span>
            </li>
            <li>
              <span className={styles.entityLabel}>任务草稿</span>
              <span className={styles.entityCount}>{data.taskDrafts.length} 条</span>
            </li>
            <li>
              <span className={styles.entityLabel}>计划导入</span>
              <span className={styles.entityCount}>{data.planImports.length} 条</span>
            </li>
            <li>
              <span className={styles.entityLabel}>岗位投递</span>
              <span className={styles.entityCount}>{data.applications.length} 条</span>
            </li>
            <li>
              <span className={styles.entityLabel}>LeetCode 题目</span>
              <span className={styles.entityCount}>
                {envelope.schemaVersion === 1
                  ? envelope.data.leetCodeProblems.length
                  : envelope.data.leetCodeCatalog.length} 条
              </span>
            </li>
          </ul>
          <p className={styles.exportedAt}>
            导出时间：{new Date(envelope.exportedAt).toLocaleString('zh-CN')}
          </p>
          <p className={styles.warning}>
            ⚠ 恢复操作将替换当前所有数据，此操作不可撤销。
          </p>
          <div className={styles.restoreActions}>
            <Button variant="danger" onClick={handleRestore}>
              恢复数据
            </Button>
            <Button variant="default" onClick={resetState}>
              取消
            </Button>
          </div>
        </div>
      )}

      {importState === 'restoring' && (
        <div className={styles.stateBox}>
          <p className={styles.stateText}>正在恢复数据，请稍候...</p>
        </div>
      )}

      {importState === 'done' && (
        <div className={styles.doneBox}>
          <span className={styles.doneIcon}>✓</span>
          <p className={styles.doneText}>数据恢复成功</p>
          <Button variant="default" size="small" onClick={resetState}>
            导入其他文件
          </Button>
        </div>
      )}
    </section>
  )
}
