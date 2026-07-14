import type {
  LegacyLeetCodeProblem,
  LeetCodeCatalogProblem,
  LeetCodeProgress,
  LeetCodeReviewRecord,
} from '@autumn-recruitment/shared'

export interface NormalizedLegacyLeetCodeData {
  leetCodeCatalog: LeetCodeCatalogProblem[]
  leetCodeProgress: LeetCodeProgress[]
  leetCodeReviews: LeetCodeReviewRecord[]
}

export function normalizeLegacyLeetCodeProblems(
  problems: LegacyLeetCodeProblem[],
): NormalizedLegacyLeetCodeData {
  const groups = new Map<string, LegacyLeetCodeProblem[]>()
  for (const problem of problems) {
    const slug = slugFromUrl(problem.url) ?? `legacy-${problem.id}`
    groups.set(slug, [...(groups.get(slug) ?? []), problem])
  }

  const leetCodeCatalog: LeetCodeCatalogProblem[] = []
  const leetCodeProgress: LeetCodeProgress[] = []
  const leetCodeReviews: LeetCodeReviewRecord[] = []

  let queueOrder = 0
  for (const [slug, groupedProblems] of groups) {
    const candidates = [...groupedProblems].sort(compareLegacyCandidates)
    const preferred = candidates[0]
    const solvedDate = candidates.find((problem) => problem.solvedDate)?.solvedDate
    const solutionSummary = candidates.find((problem) => problem.solutionSummary)?.solutionSummary
    const isSolved = candidates.some((problem) => problem.status !== 'todo')

    queueOrder++
    leetCodeCatalog.push({
      slug,
      number: preferred.number,
      title: preferred.title,
      url: preferred.url ?? '',
      difficulty: preferred.difficulty,
      tags: preferred.tags,
      source: 'custom',
      updatedAt: preferred.updatedAt,
    })
    leetCodeProgress.push({
      slug,
      status: isSolved ? 'solved' : 'todo',
      solvedDate,
      solutionSummary,
      queueOrder,
      createdAt: groupedProblems.map((problem) => problem.createdAt).sort()[0],
      updatedAt: preferred.updatedAt,
    })

    for (const problem of groupedProblems) {
      if (problem.reviewDate) {
        leetCodeReviews.push({
          id: `legacy-review:${problem.id}:pending`,
          slug,
          scheduledDate: problem.reviewDate,
          createdAt: problem.createdAt,
          updatedAt: problem.updatedAt,
        })
      }
      if (problem.lastReviewedAt) {
        leetCodeReviews.push({
          id: `legacy-review:${problem.id}:completed`,
          slug,
          scheduledDate: problem.lastReviewedAt.slice(0, 10),
          completedAt: problem.lastReviewedAt,
          outcome: 'mastered',
          createdAt: problem.createdAt,
          updatedAt: problem.updatedAt,
        })
      }
    }
  }

  return { leetCodeCatalog, leetCodeProgress, leetCodeReviews }
}

function compareLegacyCandidates(a: LegacyLeetCodeProblem, b: LegacyLeetCodeProblem): number {
  return statusRank(b.status) - statusRank(a.status)
    || b.updatedAt.localeCompare(a.updatedAt)
    || a.id.localeCompare(b.id)
}

function statusRank(status: LegacyLeetCodeProblem['status']): number {
  if (status === 'review') return 2
  if (status === 'solved') return 1
  return 0
}

function slugFromUrl(url?: string): string | undefined {
  return url?.match(/\/problems\/([^/]+)/)?.[1]
}
