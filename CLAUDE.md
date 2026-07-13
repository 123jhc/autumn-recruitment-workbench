# CLAUDE.md

## 项目概述

秋招准备工作台，本机运行的网页工具，集中管理秋招规划、任务、岗位投递和 LeetCode 刷题。

## 规格与版本

- 产品规格：`docs/superpowers/specs/2026-07-13-autumn-recruitment-workbench-design.md`
- 仪表盘布局：`docs/superpowers/specs/2026-07-13-dashboard-layout-refinement-design.md`
- AI 配置管理：`docs/superpowers/specs/2026-07-13-ai-config-management-design.md`
- 当前版本：`docs/versions/v1.1.0.md`

规格是功能范围和交互流程的权威来源。若规格与本文件冲突，以用户最新要求为最高优先级，其次以规格为准。

## 默认沟通方式

- 默认中文交流，代码标识符用清晰英文
- 先给结论，再说明修改和验证方式
- 需求有歧义时先指出；能以最小假设推进则继续，否则只问一个关键问题
- 实现功能时落实到可运行代码

## 技术架构

- 前端：Vite + React 19 + TypeScript + React Router 7
- 样式：CSS Modules
- 数据：Dexie.js 4（IndexedDB），通过 `client/src/dal/` 访问
- 状态：React Context（`client/src/contexts/`）
- 服务端：Fastify 5（`server/`），本地文件提取 + AI 代理
- AI：OpenAI 兼容接口，由服务端代理调用；多配置管理（`server/src/services/ai/config-store.ts`），JSON 文件持久化，支持网页端新增/编辑/删除/单选激活/连通测试
- 共享：`shared/` 包含类型、Zod schema、常量
- 时区：`Asia/Shanghai`，本周范围周一至周日

## 核心约束

- API Key 仅存服务端（`server/ai-configs.json` + `.env` 首次引导），不得发送到前端、写入日志或包含在备份；前端视图仅含 `hasApiKey` 布尔
- AI 生成内容只进草稿，用户确认后才能写入正式任务（单 IndexedDB 事务）
- AI 未配置时，手动任务、岗位、LeetCode、备份功能必须正常
- 数据访问全部走 DAL 层，页面不得直接操作 Dexie
- 日期 YYYY-MM-DD，时间戳 ISO 8601
- 不得引入规格外的功能，也不得擅自缩小规格范围

## 工程约束

- 只改当前任务所需文件，不重构无关代码
- 领域逻辑与 React 组件分离
- 外部输入在边界校验（表单、文件、AI 响应、备份 JSON）
- 错误消息可操作但不泄露密钥或敏感配置
- 新依赖需说明必要性

## 验证

完成前运行：测试（`npm test`）、类型检查（`npm run typecheck`）、构建（`npm run build`）
