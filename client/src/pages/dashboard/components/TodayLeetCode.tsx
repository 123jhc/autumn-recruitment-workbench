import type { LeetCodeProblem } from '@autumn-recruitment/shared'
import { useLeetCodeContext } from '../../../contexts'
import { Badge, Button, EmptyState, showToast } from '../../../components'
import { todayShanghai } from '../../../hooks/use-date-utils'
import styles from './TodayLeetCode.module.css'

interface Props { problems: LeetCodeProblem[]; loading: boolean }

export default function TodayLeetCode({ problems, loading }: Props) {
  const { completeProblem } = useLeetCodeContext()
  const completed = problems.filter((problem) => problem.status !== 'todo').length

  const handleComplete = async (problem: LeetCodeProblem) => {
    try {
      await completeProblem(problem.slug, todayShanghai())
      showToast('success', `已完成：#${problem.number ?? '-'} ${problem.title}`)
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '操作失败')
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>今日 LeetCode</h2>
        <span className={styles.count}>已完成 {completed}/{problems.length} 题</span>
      </div>
      {loading ? <p className={styles.muted}>加载中...</p> : problems.length === 0 ? (
        <EmptyState title="今天没有安排刷题" description="可在 LeetCode 页面初始化题单或重新排期" />
      ) : (
        <ul className={styles.list}>
          {problems.map((problem) => (
            <li key={problem.slug} className={styles.item}>
              <div className={styles.body}>
                <a href={problem.url} target="_blank" rel="noreferrer" className={problem.status === 'todo' ? styles.title : styles.titleDone}>
                  #{problem.number ?? '-'} {problem.title}
                </a>
                <div className={styles.meta}>
                  <Badge variant="info">{problem.topic ?? '其他题目'}</Badge>
                  <span>{problem.difficulty === 'easy' ? '简单' : problem.difficulty === 'medium' ? '中等' : '困难'}</span>
                </div>
              </div>
              {problem.status === 'todo' && <Button size="small" variant="primary" onClick={() => handleComplete(problem)}>完成</Button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
