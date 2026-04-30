# Change: add canvas text-to-speech toolbar

## Why
画布里的文本与 Card/Markdown 已支持选中和编辑，但缺少和知识库一致的语音朗读入口。用户在画布上阅读长文本时需要直接朗读，不应先跳转到知识库。

## What Changes
- 在 `popup-toolbar` 为文本与 Card/Markdown 选择态增加语音朗读按钮
- 复用现有 Web Speech 朗读能力，统一播放、暂停、继续交互
- Card 内存在局部文本选区时优先朗读选区，否则朗读整卡内容

## Impact
- Affected specs: `canvas-text-to-speech`
- Affected code:
  - `packages/drawnix/src/components/toolbar/popup-toolbar/*`
  - `packages/drawnix/src/hooks/useTextToSpeech.ts`
  - `packages/drawnix/src/i18n.tsx`
