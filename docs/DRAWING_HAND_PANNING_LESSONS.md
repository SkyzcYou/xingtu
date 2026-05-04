# 绘制工具手形平移经验

更新日期：2026-05-03

## 背景

画笔、钢笔、橡皮擦处于绘制过程中时，用户仍然期望可以临时移动画布：

- 按住空格键拖动画布。
- 按鼠标中键拖动画布。

这类交互属于画布导航能力，优先级应高于当前绘制工具的落点行为。否则用户想移动视图时，会误画线、误加钢笔锚点或误擦除元素。

## 根因

Plait 底层的 `withHandPointer` 已经支持两类平移入口：

- 空格键会让画布容器进入 `viewport-moving` 状态。
- 鼠标中键通过 `isWheelPointer(event)` 进入手形移动。

业务绘制插件位于 `withHandPointer` 外层，会先收到 `pointerDown`。如果绘制插件在中键或 `viewport-moving` 状态下直接启动绘制/擦除，就会抢走底层手形平移事件。

这次暴露出三个层面的缺口：

1. 画笔、钢笔已有空格临时手形的透传逻辑，但没有显式覆盖中键。
2. 橡皮擦缺少临时手形透传逻辑，空格和中键都可能误进入擦除。
3. 物理 Pencil 模式会屏蔽非 Pencil 事件，也会把鼠标中键平移挡掉。

## 修复原则

绘制插件不要自己实现滚动或平移。

更稳的做法是：在绘制工具的 `pointerDown` 入口先判断当前事件是否应该交给手形平移插件；如果是，只把事件下放到底层 handler，并在本插件内标记临时平移状态，后续 `pointerMove`、`pointerUp` 继续透传。

共享判断应收口到一个小工具函数，避免画笔、钢笔、橡皮擦各自复制条件：

```ts
export const shouldDelegateToHandPointer = (
  board: PlaitBoard,
  event: PointerEvent
) => {
  return isTemporaryHandMode(board) || isWheelPointer(event);
};
```

## 实现经验

### 1. 空格和中键要在同一层判断

不要只判断 `viewport-moving`。

空格键在 `pointerDown` 前通常已经给容器加上 `viewport-moving`，所以绘制插件能识别；中键则要先把 `pointerDown` 交给底层 `withHandPointer`，底层才会设置中键移动状态。

因此绘制插件入口必须同时识别：

- `PlaitBoard.getBoardContainer(board).classList.contains('viewport-moving')`
- `isWheelPointer(event)`

### 2. 临时平移期间不要完成绘制动作

临时平移的 `pointerUp` 只应透传到底层，不应调用绘制完成逻辑：

- 画笔不插入 `Freehand`。
- 钢笔不新增锚点、不完成路径。
- 橡皮擦不调用删除或精确擦除。

`globalPointerUp` 要清理本插件的临时平移状态，避免指针在画布外抬起后状态残留。

### 3. Pencil 模式仍要放行画布导航

物理 Pencil 模式屏蔽鼠标绘制是合理的，但画布导航不是绘制输入。中键和空格临时手形应绕过 `isPencilMode && !isPencilEvent` 的屏蔽逻辑。

判断顺序建议：

1. Pencil 事件可进入 Pencil 模式。
2. 普通鼠标事件默认仍屏蔽。
3. 中键或临时手形事件必须放行到底层。

### 4. 测试要覆盖“没有副作用”

这类修复不能只断言底层 handler 被调用，还要断言绘制副作用没有发生：

- 画笔中键/空格平移时不调用 `Transforms.insertNode`。
- 橡皮擦中键/空格平移时不调用 `CoreTransforms.removeElements`。
- 钢笔中键平移时不新增锚点、不插入路径。
- Pencil 模式下普通鼠标仍被屏蔽，中键和临时手形仍放行。

## 验证清单

- 画笔绘制过程中，按住空格拖动画布，不产生新笔画。
- 画笔绘制过程中，按鼠标中键拖动画布，不产生新笔画。
- 钢笔绘制过程中，按住空格拖动画布，不新增锚点。
- 钢笔绘制过程中，按鼠标中键拖动画布，不新增锚点。
- 橡皮擦过程中，按住空格拖动画布，不删除元素。
- 橡皮擦过程中，按鼠标中键拖动画布，不删除元素。
- 物理 Pencil 模式下，普通鼠标仍不能绘制，中键/空格仍能移动画布。

## 相关文件

- `packages/drawnix/src/plugins/hand-mode.ts`
- `packages/drawnix/src/plugins/freehand/with-freehand-create.ts`
- `packages/drawnix/src/plugins/freehand/with-freehand-erase.ts`
- `packages/drawnix/src/plugins/pen/with-pen-create.ts`
- `packages/drawnix/src/plugins/with-pencil.ts`
- `packages/drawnix/src/plugins/freehand/__tests__/hand-mode.test.ts`
- `packages/drawnix/src/plugins/pen/__tests__/with-pen-create.test.ts`
- `packages/drawnix/src/plugins/with-pencil.test.ts`

## 建议验证命令

```bash
pnpm exec vitest run src/plugins/freehand/__tests__/hand-mode.test.ts src/plugins/pen/__tests__/with-pen-create.test.ts src/plugins/with-pencil.test.ts --config vitest.config.ts
pnpm exec tsc -p tsconfig.lib.json --noEmit
```
