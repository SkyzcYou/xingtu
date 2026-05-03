# Change: Refactor AI JSON response parsing

## Why
部分大模型会在 JSON 前后输出 `<think>`、Markdown、解释文本或多个候选片段，现有各业务入口解析方式不一致，容易误取思考区伪 JSON 或因前缀文本报错。

## What Changes
- 新增纯工具统一提取大模型返回中的 JSON 对象/数组候选。
- 只迁移 AI/LLM 返回 JSON 的解析入口，保留普通存储、同步、HTTP 响应 JSON 解析现状。
- 将爆款视频、爆款 MV、漫画、音乐、长视频、PPT outline、Agent workflow、技能解析等业务入口改为共享候选提取，业务层继续负责 schema 校验、normalize 和降级策略。
- 为共享工具和关键业务入口补充回归测试。

## Impact
- Affected specs: ai-json-response-parsing
- Affected code:
  - `packages/drawnix/src/utils/llm-json-extractor.ts`
  - `packages/drawnix/src/components/*`
  - `packages/drawnix/src/services/*`
  - `packages/drawnix/src/mcp/tools/*`
