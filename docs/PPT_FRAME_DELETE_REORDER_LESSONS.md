# PPT 页面删除后自动重排经验

更新日期：2026-04-27

## 背景

PPT 页面底层是 `Frame` 元素。用户既可以在 PPT 编辑面板中删除页面，也可以在画布里选中 Frame 后按 `Delete` / `Backspace`，或通过画布浮动工具栏删除。只在面板按钮里处理重排，会导致不同删除入口行为不一致。

## 经验

### 1. 删除后的重排应放在画布删除链路，而不是单个 UI 入口

Plait 的键盘删除和工具栏删除最终都会走 `board.deleteFragment(elements)`。在 `with-frame` 插件里包一层 `board.deleteFragment`，可以覆盖：

- PPT 编辑面板删除
- 画布选中 Frame 后键盘删除
- 画布浮动工具栏删除
- 后续其它直接调用 `board.deleteFragment` 的入口

这样比在每个按钮回调里补重排更稳，也避免重复实现。

### 2. 删除前必须先做轻量快照

删除后 Frame 已从 `board.children` 移除，无法再可靠恢复原顺序和网格左上角。因此应在调用原始 `deleteFragment` 前记录：

- 被删除的根级 Frame ID
- 删除前有序 Frame 列表
- 删除后的剩余 Frame ID 顺序
- 当前 PPT 网格起点
- 当前每行列数

快照只保存 ID、坐标和数字，不复制页面内容，避免额外内存占用。

### 3. `getDeletedFragment` 负责补齐 Frame 内容，`deleteFragment` 负责后置重排

`getDeletedFragment` 适合根据当前选中的 Frame，把绑定到 Frame 的元素一起加入删除集合。

`deleteFragment` 更适合做重排，因为它能拿到最终删除集合，也能覆盖直接传入 `elements` 的删除调用。两者职责分开后，面板删除和画布删除不会出现漏删内容或漏重排。

### 4. 顺序源应优先使用 `pptMeta.pageIndex`

删除后重新排列时，应按 `pptMeta.pageIndex` 排序，缺失时回退到画布中的源顺序。重排完成后重新写入连续的 `pageIndex`，保证导出、播放、列表展示继续一致。

### 5. 移动 Frame 时必须带着绑定内容一起移动

自动重排不是只改 Frame 坐标。Frame 内图片、文本、媒体等内容也要一起移动，否则画布视觉会散开。

做法是删除后对剩余 Frame 收集关联元素，移动 Frame 时同步移动其关联内容，并在移动后调用 `FrameTransforms.updateFrameMembers` 修正绑定关系。

## 实现要点

- 在 `with-frame` 初始化时保存原始 `deleteFragment`。
- 删除前调用 `collectPPTFrameDeletionReflowSnapshot(board, data)`。
- 删除后调用统一的 `reflowPPTFramesAfterDeletion(board, snapshot)`。
- 重排使用已有 `getPPTFrameGridPosition` 和 `loadPPTFrameLayoutColumns`。
- 只有删除根级 Frame 且仍有剩余 Frame 时才重排，删除普通元素不触发。

## 注意事项

- 不要在 `afterChange` 里反推删除了哪些 Frame；这里缺少删除前上下文。
- 不要把重排逻辑只写在 `FramePanel`，否则画布删除入口会遗漏。
- 不要复制或缓存 Frame 内容快照，删除前记录轻量元数据即可。
- 不要重命名用户自定义页面名，只更新 `Frame 1` / `Slide 1` / `PPT 页面 1` 这类默认名。

## 验证建议

```bash
pnpm --dir packages/drawnix exec tsc -p tsconfig.lib.json --noEmit --pretty false
pnpm --dir packages/drawnix exec eslint src/plugins/with-frame.ts
git diff --check
```

手动验证：

1. 生成多页 PPT。
2. 在 PPT 编辑面板删除中间页，剩余页面自动补位并连续编号。
3. 在画布里选中中间页 Frame，按 `Delete` / `Backspace`，剩余页面自动补位并连续编号。
4. 确认每页内部图片和文本仍跟随 Frame 移动。

## 提交备注模板

```text
问题描述:
- PPT 页面只在面板删除后重排，画布中删除 Frame 后页面空位和 pageIndex 没有自动收敛。

修复思路:
- 在 with-frame 中统一包装 board.deleteFragment，删除前保存剩余 PPT 页面顺序和网格起点，删除后自动重排并重新编号。
- 保留 getDeletedFragment 负责补齐 Frame 绑定内容，避免删除入口分散。

更新代码架构:
- 将 PPT 页面删除后的重排能力下沉到 Frame 插件层，覆盖面板、键盘和画布工具栏删除入口。
- 重排只使用轻量 ID/坐标快照，不复制页面内容，避免高并发文件处理场景下的额外内存压力。
```
