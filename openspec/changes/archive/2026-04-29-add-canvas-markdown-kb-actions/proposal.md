# Change: Canvas Markdown 卡片知识库操作与内容合并

## Why
画布 Markdown 卡片的 popup-toolbar 缺少直接保存到知识库的入口，且删除旁的 duplicate 按钮对卡片错误地执行了复制文本而不是克隆元素。多选 Markdown 卡片/文本元素时，也缺少面向知识沉淀的内容合并能力。

## What Changes
- 在 popup-toolbar 为未关联知识库的 Markdown 卡片增加“保存到知识库”入口
- 修复 Markdown 卡片 duplicate 行为，使其真正克隆卡片而不是复制文本
- 为多选 Markdown 卡片和纯文本元素增加“合并内容”入口
- 合并时同步收敛知识库关联，保留一个笔记并删除多余关联笔记

## Impact
- Affected specs: `canvas-markdown-toolbar`
- Affected code:
  - `packages/drawnix/src/components/toolbar/popup-toolbar/popup-toolbar.tsx`
  - `packages/drawnix/src/utils/card-actions.ts`
  - `packages/drawnix/src/plugins/with-card.ts`
