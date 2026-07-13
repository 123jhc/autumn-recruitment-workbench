import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import type { TaskDraft, PlanImport } from '@autumn-recruitment/shared'
import {
  PLANNING_HORIZONS,
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_TEXT_LENGTH,
} from '@autumn-recruitment/shared'
import { extractFile, parsePlan } from '../../../services/api-client'
import { planImportDal } from '../../../dal/plan-import.dal'
import { taskDraftDal } from '../../../dal/task-draft.dal'
import { useSettingsContext } from '../../../contexts'
import { todayShanghai } from '../../../hooks/use-date-utils'
import { Button, Select, showToast } from '../../../components'
import DraftList from './DraftList'
import styles from './ImportSection.module.css'

type ImportMode = 'file' | 'paste'
type ImportPhase = 'idle' | 'extracting' | 'extracted' | 'parsing' | 'parsed' | 'error'

interface ImportSectionProps {
  onTasksCreated: () => void
}

export default function ImportSection({ onTasksCreated }: ImportSectionProps) {
  const { state: settingsState } = useSettingsContext()
  const aiConfigured = settingsState.activeId != null

  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<ImportMode>('file')
  const [phase, setPhase] = useState<ImportPhase>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [extractedData, setExtractedData] = useState<{
    fileName: string
    fileFormat: string
    content: string
  } | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [horizon, setHorizon] = useState<'today' | 'week' | 'season'>('week')
  const [drafts, setDrafts] = useState<TaskDraft[]>([])
  const [importId, setImportId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Helpers ---
  const resetAll = () => {
    setPhase('idle')
    setFile(null)
    setExtractedData(null)
    setPastedText('')
    setDrafts([])
    setImportId(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isAllowedFile = (f: File): boolean => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    return (ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(ext)
  }

  // --- File tab handlers ---
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return

    setError(null)

    // Extension check
    if (!isAllowedFile(f)) {
      setError('不支持的文件格式。支持: .md, .markdown, .txt, .docx, .pdf')
      return
    }

    // Size check
    if (f.size > MAX_FILE_SIZE_BYTES) {
      setError('文件大小超过 20 MB 限制')
      return
    }

    setFile(f)
    setExtractedData(null)
    setPhase('idle')
  }

  const handleExtract = async () => {
    if (!file) return
    setError(null)
    setPhase('extracting')

    try {
      const result = await extractFile(file)
      setExtractedData(result)
      setPhase('extracted')
    } catch (err) {
      const message = err instanceof Error ? err.message : '文件提取失败'
      setError(message)
      setPhase('error')
    }
  }

  // --- Paste tab handlers ---
  const handlePasteChange = (value: string) => {
    setPastedText(value)
    setError(null)
    setPhase('idle')
  }

  // --- AI parse ---
  const getActiveContent = (): string => {
    if (mode === 'file') return extractedData?.content ?? ''
    return pastedText
  }

  const handleParse = async () => {
    const content = getActiveContent()
    if (!content.trim()) {
      setError('请先上传文件并提取文字，或粘贴文本')
      return
    }

    if (content.length > MAX_TEXT_LENGTH) {
      setError(`文本长度超过限制（${MAX_TEXT_LENGTH.toLocaleString()} 字符），当前 ${content.length.toLocaleString()} 字符`)
      return
    }

    setError(null)
    setPhase('parsing')

    try {
      const planImport = await planImportDal.create({
        sourceType: mode,
        fileName: mode === 'file' ? (file?.name ?? undefined) : undefined,
        fileFormat: mode === 'file' ? (extractedData?.fileFormat as PlanImport['fileFormat'] ?? undefined) : undefined,
        rawContent: content,
        planningHorizon: horizon,
        status: 'draft',
      })

      const today = todayShanghai()
      const response = await parsePlan({
        content,
        planningHorizon: horizon,
        today,
        timezone: 'Asia/Shanghai',
      })

      const createdDrafts = await taskDraftDal.bulkCreate(
        response.tasks.map((item) => ({
          importId: planImport.id,
          title: item.title,
          category: item.category as TaskDraft['category'],
          plannedDate: item.plannedDate,
          dueDate: item.dueDate,
          priority: item.priority as TaskDraft['priority'],
          estimatedMinutes: item.estimatedMinutes,
          rationale: item.rationale,
        })),
      )

      setImportId(planImport.id)
      setDrafts(createdDrafts)
      setPhase('parsed')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 解析失败'
      setError(message)
      setPhase('error')
    }
  }

  // --- Draft handlers ---
  const handleDraftsUpdate = (updatedDrafts: TaskDraft[]) => {
    setDrafts(updatedDrafts)
  }

  const handleConfirmDrafts = () => {
    resetAll()
    setExpanded(false)
    onTasksCreated()
  }

  const handleCancelDrafts = async () => {
    if (importId) {
      try {
        // Clean up: delete drafts and mark planImport as failed
        await taskDraftDal.deleteByImportId(importId)
        await planImportDal.update(importId, { status: 'failed' }).catch(() => {})
      } catch {
        // Best-effort cleanup
      }
    }
    resetAll()
  }

  // --- Render helpers ---
  const contentLength = getActiveContent().length
  const isOverLimit = contentLength > MAX_TEXT_LENGTH
  const canParse =
    phase === 'extracted' || (mode === 'paste' && pastedText.trim().length > 0 && !isOverLimit)
  const canExtract = file != null && phase !== 'extracting'

  return (
    <div className={styles.card}>
      <div
        className={styles.cardHeader}
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded(!expanded)
          }
        }}
      >
        <h3 className={styles.cardTitle}>导入计划</h3>
        <span className={`${styles.arrow} ${expanded ? styles.arrowOpen : ''}`}>&#9660;</span>
      </div>

      {expanded && (
        <div className={styles.cardBody}>
          {!aiConfigured && (
            <div className={styles.aiNotice}>
              AI 服务未配置。AI 导入功能暂不可用，但你仍可手动新建任务。
            </div>
          )}

          {/* Mode tabs */}
          <div className={styles.tabRow}>
            <button
              type="button"
              className={`${styles.tab} ${mode === 'file' ? styles.tabActive : ''}`}
              onClick={() => { setMode('file'); setError(null); }}
            >
              上传文件
            </button>
            <button
              type="button"
              className={`${styles.tab} ${mode === 'paste' ? styles.tabActive : ''}`}
              onClick={() => { setMode('paste'); setError(null); }}
            >
              粘贴文本
            </button>
          </div>

          {/* File upload tab */}
          {mode === 'file' && (
            <div className={styles.panel}>
              <div className={styles.fileRow}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.markdown,.txt,.docx,.pdf"
                  className={styles.fileInput}
                  onChange={handleFileSelect}
                  disabled={!aiConfigured}
                />
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleExtract}
                  disabled={!canExtract || !aiConfigured}
                  loading={phase === 'extracting'}
                >
                  提取文字
                </Button>
              </div>
              {file && (
                <p className={styles.fileName}>
                  已选择: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
              {extractedData && phase === 'extracted' && (
                <div className={styles.extractPreview}>
                  <span className={styles.extractLabel}>
                    已提取 {extractedData.content.length.toLocaleString()} 字符
                  </span>
                  <pre className={styles.extractText}>
                    {extractedData.content.slice(0, 500)}
                    {extractedData.content.length > 500 ? '\n...' : ''}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Paste text tab */}
          {mode === 'paste' && (
            <div className={styles.panel}>
              <textarea
                className={styles.textarea}
                value={pastedText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder="在此粘贴你的计划文本（Markdown、TXT 等），AI 将自动拆解为任务..."
                rows={8}
                disabled={!aiConfigured}
              />
              <div className={`${styles.charCount} ${isOverLimit ? styles.charCountOver : ''}`}>
                {pastedText.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()} 字符
                {isOverLimit && ' (超限)'}
              </div>
            </div>
          )}

          {/* Planning horizon */}
          <div className={styles.horizonRow}>
            <label className={styles.horizonLabel}>计划范围</label>
            <div className={styles.horizonSelect}>
              <Select
                options={PLANNING_HORIZONS.map((h) => ({ value: h.value, label: h.label }))}
                value={horizon}
                onChange={(v) => setHorizon(v as 'today' | 'week' | 'season')}
                disabled={!aiConfigured}
              />
            </div>
          </div>

          {/* Parse button */}
          <div className={styles.parseRow}>
            <Button
              variant="primary"
              onClick={handleParse}
              disabled={!canParse || isOverLimit || !aiConfigured}
              loading={phase === 'parsing'}
            >
              AI 拆解任务
            </Button>
          </div>

          {/* Error display */}
          {error && phase === 'error' && (
            <div className={styles.errorBox}>
              <p className={styles.errorText}>{error}</p>
              <Button
                variant="default"
                size="small"
                onClick={() => {
                  if (mode === 'file' && !extractedData) {
                    handleExtract()
                  } else {
                    handleParse()
                  }
                }}
              >
                重试
              </Button>
            </div>
          )}

          {/* Draft list */}
          {phase === 'parsed' && importId && drafts.length > 0 && (
            <DraftList
              importId={importId}
              drafts={drafts}
              onDraftsUpdate={handleDraftsUpdate}
              onConfirm={handleConfirmDrafts}
              onCancel={handleCancelDrafts}
            />
          )}
        </div>
      )}
    </div>
  )
}
