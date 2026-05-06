# AI 图片蒙版编辑经验

更新日期：2026-05-05

## 背景

GPT Image 的局部编辑不是把蒙版笔迹合成到参考图里，而是通过 `/images/edits` 的独立 `mask` multipart 字段表达编辑区域。画布 UI 可以把蒙版显示成半透明笔迹，但提交给模型时必须按 OpenAI 语义输出：透明区域表示需要编辑，非透明区域表示保留。

这次问题的核心不是 UI 是否能看到蒙版，而是从画布选择、AI 输入框、任务创建、重新生成、同步/异步适配器到最终 FormData 的每一层都要保留 `maskImage`。

## 问题表现

- 蒙版笔迹被当作普通画笔合成进参考图，最终请求没有独立 `mask` 参数。
- AI 输入框预览能显示参考图，但看不出该图携带蒙版，容易误判是否会局部编辑。
- 重新生成只回填 prompt 和参考图，漏掉原任务的 `maskImage`。
- 异步图片链路只透传 `referenceImages`，未把 `maskImage` 带到 provider 表单。
- edit 请求与 generation 请求的默认参数不一致，`response_format` 没有统一默认到 `url`。

## 修复思路

- 把“蒙版画笔”作为 Freehand 的一种 shape，不新增独立实体；大小、形状、快捷键和画笔体验沿用现有工具。
- 选择单张普通图片时扫描与图片相交的蒙版笔迹，按图片显示矩形裁剪，并输出与原图自然尺寸一致的 mask 图片。
- `processSelectedContentForAI` 返回 `maskImage`，并确保蒙版笔迹不再进入普通 `graphicsImage` 合成。
- AI 输入框创建图片编辑任务时使用 `referenceImages: [原图]`、`generationMode: "image_edit"`、`maskImage`，预览中同时展示原图和蒙版。
- 任务预填、重新生成、storage、executor、同步图片适配器和异步图片适配器都透传 `maskImage`。
- GPT Image generation/edit 都默认写入 `response_format: "url"`；edit FormData 必须同时包含 `image[]` 与 `mask`。

## 代码落点

- `ai-mask-brush.ts`：蒙版笔迹发现、裁剪和导出。
- `selection-utils.ts`：选择内容时识别单图蒙版，避免把蒙版合成进普通图形。
- `AIInputBar.tsx` / `SelectedContentPreview.tsx`：AI 输入框提交与蒙版预览。
- `image-task-prefill.ts` / `task-utils.ts`：重新生成、任务回填和 mask 元数据保留。
- `gpt-image-adapter.ts`：GPT Image 请求体和 edit FormData 的默认 `response_format` 与 `mask` 字段。
- `async-image-api-service.ts` / `media-api` / `media-executor`：异步图片任务透传并提交 `maskImage`。
- `popup-toolbar.tsx` / `freehand-panel.tsx` / `with-hotkey.ts`：蒙版反选入口、工具栏入口和快捷键。

## 经验规则

- 蒙版是任务参数，不是参考图的一部分；任何合成预览都不能替代最终请求里的独立 `mask`。
- `maskImage` 必须和 `referenceImages` 一样进入任务协议、缓存解析、重新生成和异步 provider 表单。
- UI 层的 60% 透明度只是可视化效果；提交给 OpenAI 时要重新生成 alpha 语义正确的 PNG。
- 预览要展示“原图 + 蒙版”这对媒体，避免用户看见参考图却不知道是否带 mask。
- 本地缓存 URL、素材库 URL 等虚拟路径在提交 FormData 前必须解析成真实图片数据或可上传值。
- 新增图片参数时至少覆盖：选择解析、AI 输入框工作流、任务预填、同步 adapter、异步 adapter、重新生成。

## 验证

- `pnpm --dir packages/drawnix exec tsc --noEmit --pretty false`
- `pnpm --dir packages/drawnix exec vitest run src/services/__tests__/async-image-api-service.test.ts src/services/__tests__/default-image-adapter.test.ts src/services/__tests__/media-api-routing.test.ts src/services/__tests__/media-executor.test.ts`
- 建议补充抽查：`ai-mask-brush.test.ts`、`selection-utils.test.ts`、`image-task-prefill.test.ts`、`gpt-image-adapter.test.ts`、`workflow-converter.test.ts`
