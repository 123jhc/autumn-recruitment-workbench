import { NavLink } from 'react-router'
import type { ReactNode } from 'react'
import '../styles/layout.css'

const NAV_ITEMS = [
  { to: '/dashboard', label: '今日总览' },
  { to: '/tasks', label: '计划与任务' },
  { to: '/applications', label: '岗位投递' },
  { to: '/leetcode', label: 'LeetCode' },
  { to: '/settings', label: '设置' },
]

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">秋招准备工作台</div>
        <ul className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  )
}
