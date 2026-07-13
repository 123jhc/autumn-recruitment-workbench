import type { TaskCategory, ApplicationStatus, Difficulty, ProblemStatus } from '../types'

export const TASK_CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: 'resume', label: '简历' },
  { value: 'project', label: '项目' },
  { value: 'algorithm', label: '算法' },
  { value: 'knowledge', label: '八股' },
  { value: 'application', label: '投递' },
  { value: 'interview', label: '面试' },
  { value: 'other', label: '其他' },
]

export const TASK_PRIORITIES: { value: 'high' | 'medium' | 'low'; label: string }[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: 'target', label: '目标岗位' },
  { value: 'preparing', label: '准备投递' },
  { value: 'applied', label: '已投递' },
  { value: 'assessment', label: '笔试' },
  { value: 'interview', label: '面试' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: '拒绝' },
]

export const DIFFICULTIES: { value: Difficulty; label: string; color: string }[] = [
  { value: 'easy', label: '简单', color: '#52c41a' },
  { value: 'medium', label: '中等', color: '#faad14' },
  { value: 'hard', label: '困难', color: '#f5222d' },
]

export const PROBLEM_STATUSES: { value: ProblemStatus; label: string }[] = [
  { value: 'todo', label: '待刷' },
  { value: 'solved', label: '已完成' },
  { value: 'review', label: '需复习' },
]

export const PLANNING_HORIZONS: { value: 'today' | 'week' | 'season'; label: string }[] = [
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'season', label: '整个秋招' },
]

export const ALLOWED_FILE_EXTENSIONS = ['.md', '.markdown', '.txt', '.docx', '.pdf'] as const
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB
export const MAX_TEXT_LENGTH = 100_000
