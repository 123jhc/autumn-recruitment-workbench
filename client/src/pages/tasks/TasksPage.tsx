import { useState, useCallback } from 'react'
import type { Task } from '@autumn-recruitment/shared'
import { useTaskContext } from '../../contexts'
import { Button, ToastContainer } from '../../components'
import ImportSection from './components/ImportSection'
import TaskFilters from './components/TaskFilters'
import TaskList from './components/TaskList'
import TaskForm from './components/TaskForm'
import styles from './TasksPage.module.css'

export default function TasksPage() {
  const { loadTasks, state } = useTaskContext()
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const handleNewTask = useCallback(() => {
    setEditingTask(null)
    setTaskFormOpen(true)
  }, [])

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task)
    setTaskFormOpen(true)
  }, [])

  const handleCloseTaskForm = useCallback(() => {
    setTaskFormOpen(false)
    setEditingTask(null)
  }, [])

  const handleTasksCreated = useCallback(() => {
    loadTasks()
  }, [loadTasks])

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <h2 className={styles.pageTitle}>计划与任务</h2>
        <Button variant="primary" onClick={handleNewTask}>
          新建任务
        </Button>
      </div>

      <ImportSection onTasksCreated={handleTasksCreated} />

      <div className={styles.taskSection}>
        <TaskFilters />
        <div className={styles.taskListCard}>
          <TaskList onEdit={handleEditTask} />
        </div>
      </div>

      <TaskForm
        isOpen={taskFormOpen}
        onClose={handleCloseTaskForm}
        existingTask={editingTask}
      />

      <ToastContainer />
    </div>
  )
}
