import { TaskProvider } from './task-context'
import { ApplicationProvider } from './application-context'
import { LeetCodeProvider } from './leetcode-context'
import { SettingsProvider } from './settings-context'
import type { ReactNode } from 'react'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <TaskProvider>
        <ApplicationProvider>
          <LeetCodeProvider>
            {children}
          </LeetCodeProvider>
        </ApplicationProvider>
      </TaskProvider>
    </SettingsProvider>
  )
}

export { useTaskContext } from './task-context'
export { useApplicationContext } from './application-context'
export { useLeetCodeContext } from './leetcode-context'
export { useSettingsContext } from './settings-context'
