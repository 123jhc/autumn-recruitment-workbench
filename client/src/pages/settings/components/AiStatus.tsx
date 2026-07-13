import { useState } from 'react'
import { useSettingsContext } from '../../../contexts'
import { Button, Badge, showToast } from '../../../components'
import type { AiConfigView, AiConfigRequest } from '@autumn-recruitment/shared'
import AiConfigList from './AiConfigList'
import AiConfigForm from './AiConfigForm'
import styles from './AiStatus.module.css'

function AvailabilityBadge({ available }: { available: boolean | null }) {
  if (available === true) return <Badge variant="success">可用 ✓</Badge>
  if (available === false) return <Badge variant="danger">不可用</Badge>
  return <Badge variant="default">未测试</Badge>
}

export default function AiStatus() {
  const { state, loadConfigs, createConfig, updateConfig } = useSettingsContext()
  const { aiConfigs, activeId, loading } = state
  const [showList, setShowList] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AiConfigView | null>(null)

  const active = aiConfigs.find((c) => c.id === activeId) ?? null

  const handleNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const handleEdit = (cfg: AiConfigView) => {
    setEditing(cfg)
    setFormOpen(true)
  }

  const handleSubmit = async (data: AiConfigRequest) => {
    try {
      if (editing) {
        await updateConfig(editing.id, data)
      } else {
        await createConfig(data)
      }
      setFormOpen(false)
      setEditing(null)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '保存失败')
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>AI 服务状态</h2>

      <div className={styles.statusRow}>
        <div className={styles.statusInfo}>
          {active ? (
            <>
              <Badge variant="success">已配置</Badge>
              <span className={styles.modelName}>
                {active.name} · {active.model}
              </span>
              <AvailabilityBadge available={active.available} />
            </>
          ) : (
            <Badge variant="danger">未配置</Badge>
          )}
        </div>
        <div className={styles.statusActions}>
          <Button variant="default" size="small" loading={loading} onClick={loadConfigs}>
            刷新状态
          </Button>
          <Button variant="default" size="small" onClick={() => setShowList((v) => !v)}>
            {showList ? '收起' : '编辑配置'}
          </Button>
        </div>
      </div>

      {showList && <AiConfigList onEdit={handleEdit} onNew={handleNew} />}

      <AiConfigForm
        key={editing?.id ?? 'new'}
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
        editing={editing}
      />
    </section>
  )
}
