# 秋招准备工作台

本机运行的秋招准备网页工具，集中管理个人规划、每日/每周任务、岗位投递和 LeetCode 刷题记录。

## 安装

```bash
npm install
```

## AI 配置

复制 `.env.example` 为 `.env`，填入真实的 AI 服务配置：

```env
AI_BASE_URL=https://api.example.com/v1
AI_API_KEY=your-api-key
AI_MODEL=your-model-name
PORT=3001
```

AI 服务未配置时，任务管理、岗位投递、LeetCode 和备份功能仍可正常使用。

## 启动

```bash
npm run dev
```

同时启动前端开发服务器（端口 5173）和本地服务端（端口 3001），访问 http://localhost:5173。

## 构建

```bash
npm run build
```

## 测试

```bash
npm test
```

## 类型检查

```bash
npm run typecheck
```

## 备份与恢复

在"设置"页面：
- **导出备份**：将全部数据导出为 JSON 文件，文件名格式为 `秋招备份-YYYY-MM-DD.json`
- **恢复备份**：上传之前导出的 JSON 备份文件，系统会校验格式并展示数据摘要，确认后替换当前所有数据
- 备份不包含 API Key

## 功能

### 今日总览
- 今日待办、逾期任务和完成进度
- 本周任务数量与完成进度
- 岗位下一步行动
- LeetCode 复习提醒

### 计划与任务
- 手动新建任务（不依赖 AI）
- 上传 .md/.txt/.docx/.pdf 文件或粘贴文本，由 AI 拆解为任务草稿
- 草稿可编辑、删除、补充，确认后转为正式任务
- 任务筛选（今天/本周/全部/已完成，按分类）

### 岗位投递
- 维护公司、岗位、状态、投递日期等信息
- 状态统计面板
- 下一步行动可直接生成关联任务

### LeetCode
- 记录刷题、完成日期和复习日期
- 到期复习提醒显示在今日总览
- 本周统计

### 数据管理
- IndexedDB 本地持久化，刷新不丢失
- 完整 JSON 备份与恢复（含版本校验）

## 技术栈

- 前端：Vite + React 19 + TypeScript + React Router 7
- 数据：Dexie.js 4 (IndexedDB)
- 服务端：Fastify 5 + TypeScript
- AI：OpenAI 兼容接口
- 测试：Vitest

## 手动验收

1. 不配置 AI，手动创建今日任务并点击完成
2. 上传 DOCX/PDF 文件，AI 拆解后编辑草稿并确认
3. 刷新页面，验证数据持久化
4. 完成今日任务，验证进度同步更新
5. 从岗位生成下一步任务，验证关联和去重
6. 设置 LeetCode 复习日期，验证总览提醒与完成动作
7. 导出 JSON → 新增数据 → 恢复，验证数据完整恢复
