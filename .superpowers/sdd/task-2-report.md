# Task 2 报告：LeetCode UI/DAL 边界修复

## 实现

- `moveProblem` 在读取和写入队列前校验 `today > schedule.endDate`，过期时抛出“计划已过期，请先重新排期”，避免队列调序已写入而重排失败的部分更新。页面现有 `handleMove` 会将 DAL 错误原文传给错误 toast，无需修改页面生产代码。
- `update` 用自有属性判断区分 `reviewDate` 字段省略与显式 `undefined`。只要 patch 显式包含该字段，先删除该 slug 的未完成复习；值非空时再新增指定日期的未完成复习。已完成历史始终保留。
- 补充页面级回归测试，固定“今日已完成题仍显示”与“无排期自定义题在全部题目可见且按专题归入其他题目”。

## 修改文件

- `client/src/dal/leetcode.dal.ts`
- `client/src/dal/__tests__/leetcode.dal.test.ts`
- `client/src/pages/leetcode/LeetCodePage.test.tsx`
- `.superpowers/sdd/task-2-report.md`

## RED / GREEN 记录

### 修复 1：过期排期下调序

- RED：新增 `rejects moving an expired schedule before changing queue order` 后运行 `npm test -- --run client/src/dal/__tests__/leetcode.dal.test.ts`；1 失败 / 4，期望“计划已过期，请先重新排期”，实际为“开始日期不能晚于截止日期”。失败原因与缺失的写入前过期校验一致。
- GREEN：在 `moveProblem` 开头增加过期校验后重跑同一命令；4/4 通过，并断言调用前后完整 progress 数组不变。

### 修复 2：显式清空复习日期

- RED：在生产修改前新增“显式 undefined 清理待复习但保留已完成历史”、“字段省略保持不变”和“非空日期替换”测试，运行 DAL 聚焦命令；显式 undefined 用例失败，实际仍留有 `2026-07-20` 的未完成记录，其余两项基线通过。
- GREEN：改用 `hasOwnProperty` 分支并在有值时新增记录后，同一 DAL 命令 7/7 通过。

### 展示决策回归

- 补充两个页面测试后运行 `npm test -- --run client/src/pages/leetcode/LeetCodePage.test.tsx`；6/6 通过。两项均为既有产品行为固定，不涉及生产行为修复。

## 验证

- DAL + 页面聚焦：`npm test -- --run client/src/dal/__tests__/leetcode.dal.test.ts client/src/pages/leetcode/LeetCodePage.test.tsx` — 2 文件、13 测试全部通过。
- 全量：`npm test -- --run` — 22 文件、121 测试全部通过。
- 客户端类型检查：`npm run typecheck --workspace=client` — 通过。
- `git diff --check` — 通过。

## 顾虑

- 无范围内功能顾虑。测试输出仍有项目已存的 Vitest workspace 弃用提示，以及 PDF 无效数据测试的预期 warning；本任务未修改这些无关配置/测试。
