const SHANGHAI_TZ = 'Asia/Shanghai'

export function todayShanghai(): string {
  return formatShanghaiDate(new Date())
}

export function weekRangeShanghai(todayStr: string): { start: string; end: string } {
  // Parse as Shanghai midnight using explicit parts to avoid DST/timezone issues
  const [year, month, day] = todayStr.split('-').map(Number)
  // Create date in local time with the given components, then work in Shanghai timezone
  const utcDate = Date.UTC(year, month - 1, day)
  const shanghaiOffset = 8 * 60 * 60 * 1000 // UTC+8 in ms
  const shanghaiMidnight = new Date(utcDate - shanghaiOffset) // adjust to get correct local representation

  const dayOfWeek = shanghaiMidnight.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(shanghaiMidnight)
  monday.setDate(shanghaiMidnight.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: formatShanghaiDate(monday),
    end: formatShanghaiDate(sunday),
  }
}

export function isOverdue(dueDate: string | undefined, today: string): boolean {
  return !!dueDate && dueDate < today
}

export function isToday(date: string | undefined, today: string): boolean {
  return date === today
}

export function isThisWeek(date: string | undefined, weekStart: string, weekEnd: string): boolean {
  return !!date && date >= weekStart && date <= weekEnd
}

export function formatDate(date: string): string {
  return date
}

function formatShanghaiDate(date: Date): string {
  // Use the date's local representation and format manually
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
