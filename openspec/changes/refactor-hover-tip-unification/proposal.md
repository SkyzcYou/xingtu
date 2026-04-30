# Change: refactor hover tip unification

## Why

当前项目里的视觉 hover 提示交互分散在 `tdesign-react Tooltip`、`ToolButton title`、自定义 `HoverPopover`、`data-tooltip`、原生 `title`、CSS tips 和局部自制 hover tips 等多套实现中，导致样式、延迟、z-index、可访问性和维护成本都不一致。

这类交互是高频基础能力，如果不统一到共享组件，后续功能继续扩展时会不断复制分叉实现，稳定性和普适性都无法保证。

## What Changes

- 新增共享 hover 组件层，提供 `HoverTip` 与 `HoverCard`，作为应用 UI 视觉 hover 提示的唯一实现入口
- 将 `ToolButton` 与现有媒体预览 hover 基座统一到共享组件
- 将直接使用 `tdesign-react Tooltip` 的组件迁移到 `HoverTip`
- 收敛应用 UI 中原生 `title` / `data-tooltip` / CSS tips / 局部自制 hover tips 的视觉提示场景到共享组件
- 增加静态检查，阻止在组件层继续直接引入 `Tooltip` 或新增非共享 hover 提示实现
- 明确例外：Markdown/用户内容中的 `title` 保持内容语义；TDesign 表单 tips 保持表单能力边界

## Impact

- Affected specs: `hover-feedback`
- Affected code:
  - `packages/drawnix/src/components/shared/`
  - `packages/drawnix/src/components/tool-button.tsx`
  - `packages/drawnix/src/components/shared/media-preview/`
  - `packages/drawnix/src/components/audio-node-element/`
  - `packages/drawnix/src/components/canvas-search/`
