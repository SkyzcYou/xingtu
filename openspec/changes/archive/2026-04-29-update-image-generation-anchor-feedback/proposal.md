# Change: update image generation anchor feedback

## Why
当前生图提交后默认在画布内创建 `WorkZone` 进度卡。该反馈方式能够表达“系统正在执行”，但不符合无限画布的创作语义：用户希望看到的是“图片对象正在诞生”，而不是“任务卡片正在运行”。

同时，生图与文本、分析、Agent 工具调用不同，结果天然会落入画布，因此其过程反馈也应优先围绕“落点、比例、对象连续性”设计，而不是围绕“工作流步骤列表”设计。

## What Changes
- 为 AI 生图引入新的 `Generation Anchor` 反馈对象，替代默认的大面积 `WorkZone` 卡片
- 按提交时可获得的几何信息，定义三档锚点策略：
  - `Frame-first`
  - `Size-first`
  - `Ghost-anchor`
- 为生图定义统一的用户态状态机：`submitted`、`queued`、`generating`、`developing`、`inserting`、`completed`、`failed`
- 将生图的详细执行信息收敛到任务详情层，不再默认在画布中展示完整步骤卡片
- 保留失败重试、历史可追踪和刷新恢复能力，但以锚点节点而非过程卡片的形式呈现

## Impact
- Affected specs: `image-generation-feedback`
- Affected code:
  - `packages/drawnix/src/components/ai-input-bar/AIInputBar.tsx`
  - `packages/drawnix/src/hooks/useAutoInsertToCanvas.ts`
  - `packages/drawnix/src/plugins/with-workzone.ts`
  - `packages/drawnix/src/components/workzone-element/WorkZoneContent.tsx`
  - `packages/drawnix/src/services/task-queue-service.ts`
  - `packages/drawnix/src/services/canvas-operations/canvas-insertion.ts`
