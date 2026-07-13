import { TASK_CATEGORIES } from '@autumn-recruitment/shared'

export function buildPrompt(
  content: string,
  planningHorizon: string,
  today: string,
  timezone: string,
): string {
  const horizonLabels: Record<string, string> = {
    today: '今天',
    week: '本周',
    season: '整个秋招阶段',
  }

  const categoryList = TASK_CATEGORIES.map((c) => `- ${c.value}: ${c.label}`).join('\n')

  return `你是一个任务规划助手。请根据用户的计划内容，拆解为具体的可执行任务。

## 上下文
- 今天日期: ${today}
- 时区: ${timezone}
- 规划周期: ${horizonLabels[planningHorizon] || planningHorizon}

## 任务分类
${categoryList}

## 输出要求
请严格按以下 JSON 格式输出，不要输出其他内容：
{
  "tasks": [
    {
      "title": "任务标题（必填，简洁明确）",
      "category": "分类枚举值（必填，从上方分类中选择）",
      "plannedDate": "计划日期 YYYY-MM-DD（可选）",
      "dueDate": "截止日期 YYYY-MM-DD（可选）",
      "priority": "high/medium/low（必填）",
      "estimatedMinutes": 预计耗时分钟数（可选，正整数）,
      "rationale": "拆解依据（可选）"
    }
  ]
}

## 用户的计划内容
${content}`
}
