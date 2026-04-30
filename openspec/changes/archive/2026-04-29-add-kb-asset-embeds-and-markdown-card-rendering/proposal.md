# Change: 知识库素材引用与 Markdown 卡片媒体渲染

## Why
知识库笔记目前只能写纯 Markdown 文本，无法直接复用素材库中的图片、视频、音频。画布中的 Markdown 卡片虽然能展示文本，但不能统一渲染素材引用，导致知识库与画布内容能力断裂。

## What Changes
- 为知识库 Markdown 编辑器增加素材库插入入口
- 定义统一的 `asset://` 素材引用协议，并写入 Markdown 正文
- 为 Markdown 编辑器增加素材引用解析与媒体渲染
- 让画布 Markdown 卡片复用相同渲染逻辑
- 为已删除或缺失素材提供明确降级占位

## Impact
- Affected specs: `markdown-media-embeds`
- Affected code:
  - `packages/drawnix/src/components/MarkdownEditor/`
  - `packages/drawnix/src/components/knowledge-base/KBNoteEditor.tsx`
  - `packages/drawnix/src/components/card-element/CardElement.tsx`
