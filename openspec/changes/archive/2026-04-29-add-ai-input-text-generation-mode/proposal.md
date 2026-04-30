# Change: add ai input text generation mode

## Why
AI 输入栏当前把 `text` 生成类型复用于 Agent 模式，导致“文本生成”无法作为独立能力暴露，模型参数、偏好存储、历史记录和工作流路由也持续混淆。

## What Changes
- 在 AI 输入栏新增独立的 `文本` 生成类型，并保留 `Agent`
- 拆分 `agent` 与 `text` 的状态、偏好、历史记录与工作流语义
- 新增文本直出工作流：文本模型生成结果后直接插入画布
- 为文本类型接入通用模型参数调整

## Impact
- Affected specs: ai-input-generation
- Affected code: `AIInputBar`、`workflow-converter`、`ai-input-parser`、`ai-generation-preferences-service`、`media-executor`
