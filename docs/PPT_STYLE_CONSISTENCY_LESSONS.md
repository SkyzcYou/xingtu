# PPT 风格一致性经验总结

更新日期：2026-04-26

## 背景

当前 PPT 生成是“整页图片”模式：每一页都会独立排队生图。
如果只在每页 prompt 里写一句泛化风格，例如 `professional, modern, clean`，图片模型会把每页当成独立设计任务，导致封面、目录、内容页和结尾页像来自不同模板。

这类问题不能只靠“提示模型保持一致”解决，需要把“整套 PPT 的风格规格”变成可复用、可持久化的数据。

## 经验原则

1. 风格要从单页 prompt 上升为 deck 级规格。
   - 大纲阶段应生成一份全局 `styleSpec`。
   - 每页生图 prompt 都注入同一份 `styleSpec`。
   - `styleSpec` 需要具体描述色板、字体、布局、装饰母题和禁止漂移项，不能只写抽象形容词。

2. 风格规格要持久化到 PPT 页面元数据。
   - 完整 PPT、思维导图转 PPT、手动新增 PPT 页都应写入 `pptMeta.styleSpec`。
   - 单页重生成时应复用原 `slidePrompt` 和 `styleSpec`，否则新增页或重生成页容易脱离整套 PPT。

3. 相邻页面上下文比强制串行更适合作为默认策略。
   - 完整 PPT 生成如果强制等上一页图片完成再生成下一页，会明显拖慢整体体验。
   - 默认做法应保持后台并发/队列模型，只在 prompt 中注入上一页、下一页摘要。
   - 当上一页已经有生成图时，单页重生成可以把上一页图片作为额外参考图传入。

4. 参考图不能写入大对象元数据。
   - `pptMeta` 只保存轻量 URL、提示词和 `styleSpec` 文本。
   - 不要把 base64 大图、图片二进制或长文本写入 PPT 元数据，避免画布存储膨胀和内存压力。

5. 新旧数据都要能继续生成。
   - 旧大纲没有 `styleSpec` 时，解析层应自动补默认风格。
   - 模型只返回部分 `styleSpec` 字段时，应使用默认字段补齐，而不是直接拒绝整份大纲。

## 代码层面固化的规则

### 1. 大纲解析负责兜底

`parseOutlineResponse` 不只做 JSON 解析，还要把缺失或不完整的 `styleSpec` 归一化。
这样模型偶发漏字段、旧数据重跑、额外要求中包含风格描述时，都能进入同一条稳定路径。

### 2. 生图 prompt 必须包含全局风格规格

`generateSlideImagePrompt` 应包含：

- 当前页内容、版式和视觉概念
- 整套 PPT 共用的 `styleSpec`
- 上一页/下一页摘要
- 明确禁止“当前页另起一套画风、色板、字体或组件样式”

### 3. Frame 元数据是单页重生成的风格来源

创建 PPT Frame 时应写入：

- `pptMeta.slidePrompt`
- `pptMeta.styleSpec`
- `pptMeta.layout`
- `pptMeta.pageIndex`

单页重生成、历史切换、素材替换都应优先复用这些轻量元数据。

### 4. 上一页参考图按“已有则用”处理

单页 AI 生成入口可以查找上一页 PPT 图：

1. 优先按 `pptMeta.pageIndex` 找最近上一页。
2. 没有页码时，按画布 children 顺序向前兜底。
3. 找到 URL 后作为额外参考图传给图片生成弹窗。

不要为了上一页参考图改变完整 PPT 的任务调度策略。

## 检查清单

- 完整 PPT 生成：每页 `slidePrompt` 都包含同一份 `styleSpec`。
- 思维导图转 PPT：转换出的 outline 和每个 Frame 都有 `styleSpec`。
- 新增 PPT 页：继承当前 deck 的 `styleSpec`，并生成默认 `slidePrompt`。
- 单页重生成：当前页图片作为参考图；上一页已有图片时作为额外参考图。
- 旧数据兼容：缺失 `styleSpec` 的 outline 能正常解析并补默认风格。
- 性能约束：不存 base64 大图，不因风格一致性引入强制串行等待。

## 验证建议

```bash
pnpm --filter @aitu/drawnix exec vitest run \
  src/services/ppt/__tests__/ppt-prompts.test.ts \
  src/services/ppt/__tests__/mindmap-to-ppt.test.ts \
  src/services/ppt/__tests__/mindmap-to-ppt-generation.test.ts \
  src/utils/__tests__/frame-insertion-utils.test.ts

pnpm nx typecheck drawnix
```

## 提交备注模板

```text
问题描述:
- 完整 PPT 和单页 PPT 生图各自独立理解风格，导致页面之间视觉体系不一致。

修复思路:
- 引入 deck 级 styleSpec，并在大纲解析、整页生图 prompt、Frame 元数据和单页重生成入口中复用。
- 单页重生成在已有上一页图片时带入上一页参考图，但不改变完整 PPT 的队列并发策略。

更新代码架构:
- PPT prompt 层负责 styleSpec 生成、归一化和注入。
- PPT Frame 元数据新增轻量 styleSpec，作为后续重生成的风格来源。
```
