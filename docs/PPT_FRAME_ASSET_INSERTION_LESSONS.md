# PPT Frame 素材插入经验

更新日期：2026-04-27

## 背景

用户在画布中选中 PPT 页面（底层为 `Frame`）后，从素材库或生成结果插入图片/视频，预期素材进入当前 PPT 页面并自适应页面尺寸。旧逻辑只把素材插入到选中元素下方，导致素材落在页面外，需要用户手动拖入和执行「素材自适应PPT」。

## 经验

### 1. 先复用 Frame 内部插入能力

`insertMediaIntoFrame` 已经覆盖 Frame 查找、contain/stretch 适配、居中放置和 `frameId` 绑定。新需求不要再在素材库、任务队列、AI 预览等入口各写一套几何逻辑，只在通用插入链路前置识别「单选 Frame」即可。

### 2. 单选 Frame 才改变插入语义

只有当前 selection 或 `appState.lastSelectedElementIds` 是单个 Frame 时，才插入到 Frame 内。多选、选中普通元素、拖拽指定坐标、显式传入 `startPoint/referenceDimensions` 时，应继续沿用原插入位置，避免破坏批量排列和拖拽语义。

### 3. PPT 自适应要用 contain，不要默认拉伸

插入到 PPT 页面内的图片/视频应保持媒体比例并居中适配 Frame。只有明确传 `{ fit: 'stretch' }` 时才铺满页面，避免素材变形。视频没有真实尺寸时可用 16:9 兜底，但如果上层已传媒体尺寸，必须尊重该尺寸计算适配。

### 4. 插入后必须绑定 `frameId`

PPT 导出、Frame 移动、预览缩略图和「素材自适应PPT」都依赖 `frameId` 或几何相交关系。插入时直接绑定 `frameId`，比后续靠最大相交面积补救更稳定。

### 5. 底层修复优先于入口补丁

素材插入入口很多：素材库、任务队列、AI 预览、MCP/工作流、快捷工具栏。修在 `insertImageFromUrl`、`insertVideoFromUrl` 和 `executeCanvasInsertion` 这类公共层，能覆盖更多路径，也减少后续漏改风险。

## 实现要点

- 新增 `getSelectedInsertionFrame`：优先读当前 selection，selection 为空时回退 `lastSelectedElementIds`。
- 新增 `insertMediaIntoSelectedFrame`：把选中 Frame 的 `points` 转为目标尺寸，再调用 `insertMediaIntoFrame`。
- 图片/视频通用插入函数在没有显式坐标和尺寸时，先尝试插入选中 Frame。
- `executeCanvasInsertion` 对单个图片/视频内容做同样前置处理，覆盖 `quickInsert`、任务队列和 AI 预览。
- 视频插入新增 `lockReferenceDimensions`，避免 Frame 适配后的尺寸再次被默认 16:9 逻辑改写。

## 注意事项

- 不要为了「当前 PPT」新增实体或全局状态；当前画布 selection 已经足够表达目标 Frame。
- 不要在插入前完整下载视频元数据；高并发文件处理场景下应保持轻量，必要时使用传入尺寸或默认比例。
- 不要让 `startPoint` 场景自动吸附 Frame；拖拽和批量排版需要尊重调用方坐标。
- 不要只改素材库按钮；生成结果、工作流和预览器也会走插入链路。

## 验证建议

1. 指定文件测试：

```bash
pnpm --dir packages/drawnix exec vitest run src/utils/__tests__/frame-insertion-utils.test.ts src/utils/__tests__/ppt-media-fit.test.ts
```

2. 类型检查：

```bash
pnpm nx run drawnix:typecheck
```

3. 注意测试命令：

```bash
pnpm --filter @aitu/drawnix test -- frame-insertion-utils.test.ts
```

该写法会被当前包脚本吞成更大范围测试，可能暴露仓库既有 unrelated 失败。需要精确验证单文件时，优先使用 `pnpm --dir packages/drawnix exec vitest run ...`。

## 检查清单

- 单选 PPT 页面后插入图片，图片出现在页面内部并保持比例。
- 单选 PPT 页面后插入视频，视频出现在页面内部并保持比例。
- 插入后的媒体元素带有目标页面 `frameId`。
- 未选中 Frame 时，素材仍插入到原来的默认位置。
- 传入显式 `startPoint` 的批量插入不被 Frame 逻辑劫持。
