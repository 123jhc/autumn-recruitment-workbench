import { useState, type FormEvent } from 'react'
import type { AiConfigView, AiConfigRequest } from '@autumn-recruitment/shared'
import { Drawer, Button, FormField } from '../../../components'
import styles from './AiConfigForm.module.css'

interface AiConfigFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AiConfigRequest) => Promise<void>
  editing: AiConfigView | null
}

const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1'
const DEFAULT_MODEL = 'deepseek-v4-flash'

export default function AiConfigForm({ isOpen, onClose, onSubmit, editing }: AiConfigFormProps) {
  const isEditing = editing != null
  const [name, setName] = useState(editing?.name ?? '')
  const [baseUrl, setBaseUrl] = useState(editing?.baseUrl ?? DEFAULT_BASE_URL)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(editing?.model ?? DEFAULT_MODEL)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = '请输入名称'
    if (!/^https?:\/\//.test(baseUrl.trim())) next.baseUrl = 'Base URL 需以 http(s):// 开头'
    if (!model.trim()) next.model = '请输入模型名'
    if (!isEditing && !apiKey.trim()) next.apiKey = '请填写 API Key'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const data: AiConfigRequest = {
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        model: model.trim(),
      }
      if (apiKey.trim()) data.apiKey = apiKey.trim()
      await onSubmit(data)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? '编辑配置' : '新增配置'}
      width={480}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <FormField label="名称" required error={errors.name} htmlFor="ai-name">
          <input
            id="ai-name"
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：DeepSeek 官方"
          />
        </FormField>
        <FormField label="API Base URL" required error={errors.baseUrl} htmlFor="ai-baseurl">
          <input
            id="ai-baseurl"
            className={styles.input}
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.deepseek.com/v1"
          />
        </FormField>
        <FormField
          label="API Key"
          required={!isEditing}
          error={errors.apiKey}
          htmlFor="ai-apikey"
        >
          <input
            id="ai-apikey"
            className={styles.input}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={isEditing ? '留空表示不修改' : 'sk-...'}
          />
        </FormField>
        <FormField label="Model" required error={errors.model} htmlFor="ai-model">
          <input
            id="ai-model"
            className={styles.input}
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="deepseek-v4-flash"
          />
        </FormField>
        <div className={styles.actions}>
          <Button variant="default" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            {isEditing ? '保存修改' : '新增配置'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
