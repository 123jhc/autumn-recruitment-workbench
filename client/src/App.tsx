import { Routes, Route, Navigate } from 'react-router'
import Layout from './components/Layout'
import { AppProviders } from './contexts'
import { ToastContainer } from './components'
import DashboardPage from './pages/dashboard/DashboardPage'
import TasksPage from './pages/tasks/TasksPage'
import ApplicationsPage from './pages/applications/ApplicationsPage'
import LeetCodePage from './pages/leetcode/LeetCodePage'
import SettingsPage from './pages/settings/SettingsPage'

function App() {
  return (
    <AppProviders>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/leetcode" element={<LeetCodePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
      <ToastContainer />
    </AppProviders>
  )
}

export default App
