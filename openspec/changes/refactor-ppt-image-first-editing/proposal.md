# Change: Refactor PPT to image-first editing

## Why
当前 PPT 流程把 Frame、文本布局、配图、背景图、单页导出拆得过细；在 `gpt-image-2` 已能生成完整 PPT 页面的前提下，这会让用户理解成本和操作步骤都偏高。

## What Changes
- 将“Frame 管理”的 PPT 使用语义改为“PPT 编辑”，以页卡方式管理 PPT 页面并展示每页预览。
- 将 PPT 生成改为整页图片范式：每页 Frame 主要承载一张完整幻灯片图片，图片包含最终文字、版式和视觉效果。
- 移除 PPT 页面背景图入口；整页图片已包含背景，更换背景不再作为 PPT 编辑动作。
- 将单页 PPT 导出入口替换为“重新生成”：用当前页图片作为参考图、原提示词预填 AI 图片生成弹窗，成功后替换回对应页面。
- 保留整套 PPT 导出能力，导出结果仍按 Frame 顺序生成完整 PPT 文件。

## Impact
- Affected specs: `ppt-editing`
- Affected code: `packages/drawnix/src/services/ppt`, `packages/drawnix/src/components/project-drawer`, `packages/drawnix/src/components/ttd-dialog`, `packages/drawnix/src/hooks/useAutoInsertToCanvas.ts`
