# 媒体预览触控板缩放经验

更新日期：2026-04-30

## 背景

图片、视频预览里使用触控板放大缩小时，缩放速度太快，细微手势也会明显跳变，导致用户很难停在想要的比例。

这类问题不要只看“最大/最小缩放值”。真正影响手感的通常是 wheel 事件的粒度、单次缩放步进、连续事件同步方式。

## 根因

### 1. 高频 wheel 不能用固定大步进

触控板会连续发出很多小 `wheel` 事件。若每次都固定 `+0.1` 或 `-0.1`，微小手势也会被放大成大幅缩放。

经验：

- 触控板/滚轮缩放要按 `deltaY` 计算比例，而不是只看方向。
- 要限制单个事件最大缩放量，防止鼠标滚轮或系统加速度造成跳变。
- `deltaMode` 不是像素时要先归一化，避免不同设备手感差异过大。

### 2. 首次自适应不能制造视觉跳动

预览容器、图片/视频元信息和 CSS 尺寸可能不是同一帧就绪。如果先显示原始比例，再下一帧自适应，会让用户看到明显跳动。

经验：

- 首次进入预览时可以等 auto-fit 计算完成后再显示媒体内容。
- 容器尺寸变化要重新触发 auto-fit，但用户手动拖拽/缩放后不要再自动覆盖视图。
- auto-fit 相关隐藏样式要只作用于媒体内容，不影响工具栏和视频控件交互状态。

### 3. 连续缩放要读取最新值

React 事件回调在高频输入下容易遇到闭包值滞后。连续 wheel 中如果一直基于旧 `localZoom` 计算，会让缩放节奏不稳定。

经验：

- 高频交互中的当前值可用 `ref` 保存。
- 状态更新仍走 `setState`，但计算基准优先读 ref 中的最新缩放。
- 只有缩放值实际变化超过极小阈值时才通知父层，减少无意义渲染。

### 4. 同步模式不要传相对增量

媒体预览内部已经算出了目标缩放值，父层若再用 `z - zoomLevel` 转为相对增量，高频事件下容易叠加闭包误差。

经验：

- 子组件已经得到目标 zoom 时，父级 action 应支持设置绝对缩放值。
- 快捷键、按钮这类明确步进仍适合保留相对 `zoom(delta)`。
- wheel/pinch 这类连续输入更适合 `setZoomLevel(value)`。

## 修复规则

1. 媒体预览 wheel 缩放按归一化 `deltaY` 计算。
2. 单次 wheel 缩放增量必须有限幅。
3. 首次 auto-fit 完成前隐藏媒体内容，避免先大后小的闪跳。
4. 用户手动拖拽/缩放后，auto-fit 不再覆盖当前视图。
5. 触控板缩放基准值使用 ref 保持最新。
6. 父层同步缩放使用绝对值 setter，避免连续事件误差。
7. 按钮和快捷键步进保持原有节奏，不和触控板手感绑定。

## 验证清单

- 图片预览中触控板轻推时缩放变化更细。
- 视频预览中触控板轻推时缩放变化更细。
- 工具栏放大/缩小按钮仍按原步进工作。
- 对比联动模式下缩放同步稳定，不出现过度叠加。
- `pnpm nx typecheck drawnix` 通过。

## 相关文件

- `packages/drawnix/src/components/shared/media-preview/MediaViewport.tsx`
- `packages/drawnix/src/components/shared/media-preview/MediaViewport.scss`
- `packages/drawnix/src/components/shared/media-preview/useViewerState.ts`
- `packages/drawnix/src/components/shared/media-preview/UnifiedMediaViewer.tsx`
- `packages/drawnix/src/components/shared/media-preview/types.ts`
