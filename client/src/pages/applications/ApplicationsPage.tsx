import { useState, useCallback } from 'react'
import type { Application, ApplicationStatus } from '@autumn-recruitment/shared'
import { useApplicationContext } from '../../contexts'
import {
  Button,
  ConfirmDialog,
  ToastContainer,
  showToast,
} from '../../components'
import StatusBoard from './components/StatusBoard'
import ApplicationFilters from './components/ApplicationFilters'
import ApplicationList from './components/ApplicationList'
import ApplicationForm from './components/ApplicationForm'
import type { ApplicationFormData } from './components/ApplicationForm'
import styles from './ApplicationsPage.module.css'

export default function ApplicationsPage() {
  const {
    state,
    createApplication,
    updateApplication,
    deleteApplication,
    countByStatus,
    setFilterStatus,
    setSearchQuery,
  } = useApplicationContext()

  const { applications, loading, filterStatus, searchQuery, error } = state

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<Application | null>(null)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null)

  // -- Handlers --

  const handleNewApplication = useCallback(() => {
    setEditingApp(null)
    setDrawerOpen(true)
  }, [])

  const handleEdit = useCallback((app: Application) => {
    setEditingApp(app)
    setDrawerOpen(true)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false)
    setEditingApp(null)
  }, [])

  const handleSubmitForm = useCallback(
    async (data: ApplicationFormData) => {
      try {
        if (editingApp) {
          await updateApplication(editingApp.id, {
            company: data.company.trim(),
            role: data.role.trim(),
            location: data.location.trim() || undefined,
            url: data.url.trim() || undefined,
            requirements: data.requirements.trim() || undefined,
            status: data.status,
            appliedDate: data.appliedDate || undefined,
            nextAction: data.nextAction.trim() || undefined,
            nextActionDate: data.nextActionDate || undefined,
            notes: data.notes.trim() || undefined,
          })
          showToast('success', '岗位已更新')
        } else {
          await createApplication({
            company: data.company.trim(),
            role: data.role.trim(),
            location: data.location.trim() || undefined,
            url: data.url.trim() || undefined,
            requirements: data.requirements.trim() || undefined,
            status: data.status,
            appliedDate: data.appliedDate || undefined,
            nextAction: data.nextAction.trim() || undefined,
            nextActionDate: data.nextActionDate || undefined,
            notes: data.notes.trim() || undefined,
          })
          showToast('success', '岗位已添加')
        }
        handleCloseDrawer()
      } catch (err) {
        const message = err instanceof Error ? err.message : '保存失败'
        showToast('error', message)
        throw err
      }
    },
    [editingApp, createApplication, updateApplication, handleCloseDrawer],
  )

  const handleDeleteRequest = useCallback((app: Application) => {
    setDeleteTarget(app)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteApplication(deleteTarget.id)
      showToast('success', '岗位已删除')
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除失败'
      showToast('error', message)
    } finally {
      setDeleteTarget(null)
    }
  }, [deleteTarget, deleteApplication])

  const handleStatusFilter = useCallback(
    (status: ApplicationStatus | null) => {
      setFilterStatus(status)
    },
    [setFilterStatus],
  )

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query)
    },
    [setSearchQuery],
  )

  const handleClearFilters = useCallback(() => {
    setFilterStatus(null)
    setSearchQuery('')
  }, [setFilterStatus, setSearchQuery])

  const handleStatusChange = useCallback(
    (status: ApplicationStatus | null) => {
      setFilterStatus(status)
    },
    [setFilterStatus],
  )

  // -- Derived --
  const statusCounts = countByStatus()

  // -- Render --
  if (loading && applications.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>岗位投递</h1>
        </div>
        <p style={{ color: 'var(--color-text-secondary)' }}>加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>岗位投递</h1>
        </div>
        <p style={{ color: 'var(--color-danger)' }}>{error}</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>岗位投递</h1>
        <Button variant="primary" onClick={handleNewApplication}>
          新增岗位
        </Button>
      </div>

      <StatusBoard
        countByStatus={statusCounts}
        activeStatus={filterStatus}
        onSelectStatus={handleStatusFilter}
      />

      <ApplicationFilters
        searchQuery={searchQuery}
        filterStatus={filterStatus}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onClear={handleClearFilters}
      />

      <ApplicationList
        applications={applications}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        onNewApplication={handleNewApplication}
      />

      <ApplicationForm
        key={editingApp?.id ?? 'new'}
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleSubmitForm}
        editing={editingApp}
      />

      <ConfirmDialog
        isOpen={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="确认删除"
        message={
          deleteTarget
            ? `确定要删除「${deleteTarget.company} - ${deleteTarget.role}」吗？此操作不可撤销。`
            : ''
        }
        confirmLabel="删除"
        confirmVariant="danger"
      />

      <ToastContainer />
    </div>
  )
}
