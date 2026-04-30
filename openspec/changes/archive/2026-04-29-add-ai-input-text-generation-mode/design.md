## Context

当前 AI 输入栏中 `text` 既表示文本模型，又承担 Agent 模式入口。这个复用导致：

- UI 无法显式提供“文本生成”
- 历史记录与偏好存储只能把 `text` 特判成 `agent`
- 后续给文本模型增加参数与执行链时会继续污染 Agent 逻辑

## Decision

- 引入独立的 `agent` 生成类型
- 保留 `text` 作为纯文本生成
- `agent` 继续走 `ai_analyze`
- `text` 新增直接生成步骤 `generate_text`
- 文本生成完成后统一落到 `insert_to_canvas`

## Notes

- 旧本地存储中的 `generationType: text` 默认视为旧 Agent 模式，并通过版本字段迁移
- 文本类型首版保持 `count = 1`
- 文本参数先接入通用的 `temperature`、`top_p`、`max_tokens`
