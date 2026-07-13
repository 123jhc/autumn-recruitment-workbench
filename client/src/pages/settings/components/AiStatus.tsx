import { useSettingsContext } from '../../../contexts'
import { Button, Badge } from '../../../components'
import styles from './AiStatus.module.css'

export default function AiStatus() {
  const { state, checkAiStatus } = useSettingsContext()
  const { aiConfigured, aiModel, loading } = state

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>AI 服务状态</h2>
      <div className={styles.statusRow}>
        <div className={styles.statusInfo}>
          {aiConfigured ? (
            <>
              <Badge variant="success">已配置</Badge>
              {aiModel && <span className={styles.modelName}>{aiModel}</span>}
            </>
          ) : (
            <>
              <Badge variant="danger">未配置</Badge>
              <div className={styles.instructions}>
                <p>请在项目根目录创建 .env 文件并配置以下环境变量：</p>
                <pre className={styles.codeBlock}>
                  AI_BASE_URL=https://api.example.com/v1{'\n'}
                  AI_API_KEY=your-api-key{'\n'}
                  AI_MODEL=your-model-name
                </pre>
              </div>
            </>
          )}
        </div>
        <Button variant="default" size="small" loading={loading} onClick={checkAiStatus}>
          刷新状态
        </Button>
      </div>
    </section>
  )
}
