## Context
大模型 JSON 输出不是稳定的裸 JSON：可能被 `<think>`、代码块、自然语言说明或多个候选 JSON 包裹。业务模块需要根据自身 schema 选择正确候选，而不是各自用正则或贪婪匹配。

## Goals
- 提供无组件/服务依赖的纯工具，避免循环依赖。
- 支持对象和数组协议，并允许 predicate 选择业务匹配候选。
- 让业务模块保留现有校验、normalize、修复和降级策略。

## Non-Goals
- 不替换 localStorage、GitHub 同步、备份、HTTP API body 等普通 JSON 解析。
- 不引入流式增量 JSON 解析。
- 不统一各业务返回 schema。

## Decisions
- 工具放在 `packages/drawnix/src/utils/llm-json-extractor.ts`。
- 候选查找顺序优先使用 fenced JSON、去除完整 `<think>` 后的内容、`</think>` 后内容、最后回退完整文本。
- 使用括号平衡扫描，并识别 JSON 字符串内的括号和转义，避免字符串内容破坏平衡。
- `extractJsonValue` 返回已解析值，`extractJsonSource` 返回原始 JSON 字符串，兼容需要二次修复/解析的旧逻辑。
