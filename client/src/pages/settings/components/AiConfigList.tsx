import { useState } from 'react'
import type { AiConfigView } from '@autumn-recruitment/shared'
import { useSettingsContext } from '../../../contexts'
import { Button, Badge, ConfirmDialog, showToast } from '../../../components'
import styles from './AiConfigList.module.css'

interface AiConfigListProps {
  onEdit: (config: AiConfigView) => void
  onNew: () => void
}

function AvailabilityBadge({ available }: { available: boolean | null }) {
  if (available === true) return <Badge variant="success">可用</Badge>
  if (available === false) return <Badge variant="danger">不可用</Badge>
  return <Badge variant="default">未测试</Badge>
}

export default function AiConfigList({ onEdit, onNew }: AiConfigListProps) {
  const { state, setActive, testConfig, deleteConfig } = useSettingsContext()
  const { aiConfigs, activeId } = state
  const [testingId, setTestingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AiConfigView | null>(null)

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      const result = await testConfig(id)
      if (!result.ok) {
        showToast('error', result.message ?? '连通测试失败')
      }
    } finally {
      setTestingId(null)
    }
  }

  const handleSetActive = async (id: string) => {
    try {
      await setActive(id)
      showToast('success', '已切换当前配置')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '切换失败')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deleteConfig(deleteTarget.id)
      showToast('success', '配置已删除')
      setDeleteTarget(null)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '删除失败')
    }
  }

  const isActive = (id: string) => id === activeId

  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>AI 配置</span>
        <Button variant="primary" size="small" onClick={onNew}>
          + 新增配置
        </Button>
      </div>

      {aiConfigs.length === 0 ? (
        <p className={styles.empty}>暂无配置，点击「新增配置」添加。</p>
      ) : (
        <ul className={styles.items}>
          {aiConfigs.map((cfg) => (
            <li key={cfg.id} className={styles.item}>
              <span className={styles.radio}>{isActive(cfg.id) ? '◉' : '○'}</span>
              <div className={styles.info}>
                <span className={styles.name}>{cfg.name}</span>
                <span className={styles.model}>{cfg.model}</span>
              </div>
              <div className={styles.badgeCell}>
                <AvailabilityBadge available={cfg.available} />
              </div>
              <div className={styles.actions}>
                {!isActive(cfg.id) && (
                  <Button variant="text" size="small" onClick={() => handleSetActive(cfg.id)}>
                    设为当前
                  </Button>
                )}
                <Button
                  variant="text"
                  size="small"
                  loading={testingId === cfg.id}
                  onClick={() => handleTest(cfg.id)}
                >
                  测试
                </Button>
                <Button variant="text" size="small" onClick={() => onEdit(cfg)}>
                  编辑
                </Button>
                <Button variant="text" size="small" onClick={() => setDeleteTarget(cfg)}>
                  删除
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="确认删除"
        message={
          deleteTarget
            ? isActive(deleteTarget.id)
              ? `「${deleteTarget.name}」当前正在使用，删除后将变为未配置。确定删除吗？`
              : `确定要删除配置「${deleteTarget.name}」吗？`
            : ''
        }
        confirmLabel="删除"
        confirmVariant="danger"
      />
    </div>
  )
}
