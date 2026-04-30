# 图片/视频预览自适应经验总结

更新日期：2026-04-30

## 背景

统一媒体预览器在展示横图、竖图、4K 大图和视频时，曾出现三个典型问题：

1. 横图被按竖图思路缩放，展示区域浪费明显。
2. 放大后的媒体偏下，和底部工具条重叠。
3. 切换 4K 图片时，首帧先以 100% 或旧缩放比例显示，再闪缩到自适应尺寸。

这类问题不能只调 CSS 的 `object-fit`。预览器同时存在 CSS contain、React 状态缩放、拖拽偏移、视频 metadata、图片自然尺寸、工具条遮挡等因素，必须统一处理首帧、尺寸计算和交互状态。

## 经验原则

1. 自适应目标是“完整显示并尽量利用可见区域”。
   - 横图应优先吃满可用宽度。
   - 竖图应优先吃满可用高度。
   - 不应为填满高度而默认裁切横图，除非产品明确进入 cover/裁切模式。

2. 避免 CSS contain 后再按原图像素二次缩小。
   - `<img>` / `<video>` 先由 CSS `max-width/max-height` 得到基础渲染尺寸。
   - JS 再基于这个基础尺寸计算还能放大或缩小多少。
   - 不要直接用 `naturalWidth/naturalHeight` 对视口做第二次 contain，否则横图容易被过度缩小。

3. 首帧必须先 fit，再显示。
   - 图片需要等 `complete + naturalWidth` 或 `onLoad` 后再计算。
   - 视频需要等 `loadedmetadata` 后读取 `videoWidth/videoHeight`。
   - fit 未完成时用 `visibility: hidden` 隐藏内容，仍保留布局和测量能力。
   - 不要用 `display: none`，否则 `offsetWidth/offsetHeight` 会失效。

4. 自动 fit 应尽量在绘制前完成。
   - 切换媒体、同步外部 zoom/pan、图片已加载检查适合使用 `useLayoutEffect`。
   - 避免在首帧 fit 上使用 `requestAnimationFrame`，否则会先绘制中间尺寸。
   - 普通 ResizeObserver 后续修正可以保留，但要避免重复设置同样的 pan/zoom。

5. 工具条遮挡应进入可用区域计算。
   - 底部工具条占用的高度应作为 `verticalReserve`。
   - 自动位置可上移 `verticalReserve / 2`，让媒体中心对齐到真正可见区域中心。
   - 用户手动拖拽或缩放后，不再强行自动覆盖位置。

6. 自动适配不要制造动画。
   - 预览内容的 `transform` 不应有 transition。
   - 切换媒体时应直接显示最终 transform。
   - 用户滚轮缩放也应使用稳定步进和 clamp，避免高频滚轮造成跳变过大。

7. 性能与内存约束。
   - 不读取图片二进制，不把 4K 图转成 base64 存状态。
   - 只读取 DOM 尺寸和媒体自然宽高。
   - 状态更新前比较当前值，避免 ResizeObserver 下重复渲染。

## 代码层面固化的规则

### 1. 自动 fit 基于基础渲染尺寸

优先读取媒体元素的 `offsetWidth/offsetHeight`。当元素还没有 offset 时，再用 `getBoundingClientRect() / currentZoom` 兜底。

计算公式：

```text
availableWidth = viewportWidth - horizontalPadding
availableHeight = viewportHeight - verticalReserve
fittedZoom = min(
  availableWidth / baseRenderedWidth,
  availableHeight / baseRenderedHeight
)
```

### 2. 首帧隐藏直到 fit 完成

单图图片/视频需要自动 fit 时：

- 切换媒体后设置 `isAutoFitReady = false`。
- 图片 `onLoad` 或视频 `onLoadedMetadata` 后计算 fit。
- fit 成功后设置 `isAutoFitReady = true`。
- 加载失败或用户手动介入时解除隐藏，避免卡住。

### 3. 工具条避让用自动 pan

自动 fit 完成时设置：

```text
pan = { x: 0, y: -verticalReserve / 2 }
```

这会把媒体整体上移到可见区域中心，避免压到底部工具条。

### 4. 用户操作优先

手动拖拽、滚轮、工具栏缩放后标记 `hasManualViewChange`。后续 ResizeObserver 或加载回调不再覆盖用户视图。

## 检查清单

- 横图：宽度尽量铺满，不出现大量上下浪费。
- 竖图：高度尽量铺满，完整显示。
- 4K 大图：切换时不出现 100% 到自适应尺寸的闪缩。
- 视频：metadata 到位后直接按正确尺寸展示。
- 底部工具条：不遮挡主要画面。
- 手动缩放/拖拽：不被自动 fit 抢回。
- 对比模式：不受单图自动 fit 逻辑干扰。
- 性能：不引入大文件读取、base64 存储或频繁无效状态更新。

## 验证建议

```bash
pnpm --dir packages/drawnix exec eslint src/components/shared/media-preview/MediaViewport.tsx --ext .tsx --rule '@nx/enforce-module-boundaries: off'
git diff --check -- packages/drawnix/src/components/shared/media-preview/MediaViewport.tsx packages/drawnix/src/components/shared/media-preview/MediaViewport.scss docs/MEDIA_PREVIEW_FIT_LESSONS.md
```

若仓库全量类型检查恢复干净后，再补跑：

```bash
pnpm --dir packages/drawnix exec tsc -p tsconfig.lib.json --noEmit --pretty false
```

## 提交备注模板

```text
问题描述:
- 图片/视频预览自适应不区分横竖图，4K 图切换时会先显示中间尺寸再闪缩。

修复思路:
- 基于媒体基础渲染尺寸计算 contain zoom。
- 首帧自动 fit 完成前隐藏媒体内容，避免 100% 闪缩。
- 自动 pan 上移避让底部工具条，并移除 transform 过渡。

更新代码架构:
- MediaViewport 收口自动 fit、手动视图保护和 fit-ready 展示门槛。
- MediaViewport 样式增加 auto-fitting 隐藏态。
```
