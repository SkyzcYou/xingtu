# Change: Parallelize workflow batch video generation

## Why
爆款 MV 与爆款视频第三步当前按镜头串行生成，并依赖上一段尾帧驱动下一段首帧。实际效果看尾帧传递对后续片段影响不大，串行等待会显著拉长整条工作流耗时。

## What Changes
- 将“全部→生成视频”从按镜头串行改为按镜头并行的独立流水线。
- 每个镜头流水线内部仍保持顺序：先结合上下文、角色参考图生成本镜头首帧，再用该首帧生成本镜头视频。
- 批量生成不再自动提取上一段尾帧作为下一段首帧，也不再因前一段失败阻塞后一段。
- 批量进度、停止与失败重试语义改为按镜头独立统计。

## Impact
- Affected specs: `video-batch-generation`
- Affected code:
  - `packages/drawnix/src/components/mv-creator/pages/GeneratePage.tsx`
  - `packages/drawnix/src/components/video-analyzer/pages/GeneratePage.tsx`
  - focused tests/helpers where available
