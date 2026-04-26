# 我的提示词弹窗与工具窗口启用经验

更新日期：2026-04-27

## 背景

提示词选择器标题从“提示词”改为“我的提示词”后，点击标题需要打开同名工具窗口，并进入当前生成类型对应的分类筛选。

这条链路横跨 AI 输入栏、提示词选择器、工具窗口服务、WinBox 管理器和“我的提示词”工具本体。问题不是单个按钮文案，而是“轻量入口如何唤醒重工具窗口”的协作边界。

## 问题现象

- 第一次点击“我的提示词”没有弹出窗口。
- 控制台显示 `toolWindowService.openTool` 已创建 `prompt-history` 实例，状态也是 `open`。
- 用户看到的状态却像是窗口仍在左侧工具栏或没有出现。

关键日志：

```text
[PromptHistoryPopover] open my prompts beforeStatus: undefined
[ToolWindowService] openTool:new-instance status: open
[PromptHistoryPopover] requested my prompts open afterStatus: open
```

这说明服务层状态已成功打开，问题不在 `openTool` 本身，而在渲染这个状态的 WinBox 管理器没有提前启用。

## 根因

`ToolWinBoxManager` 是延迟功能，只有 `toolWindowManagerEnabled` 为 true 时才挂载。左侧工具栏按钮会通过 `enableToolWindows` 先启用工具窗口运行时，再打开工具。

提示词选择器属于 AI 输入栏里的轻量入口，最初直接调用：

```ts
toolWindowService.openTool(tool, { componentProps });
```

这会造成一种半成功状态：

- 服务层已经有 `open` 实例。
- 管理器尚未挂载，因此没有 WinBox 来消费和渲染这条状态。
- 后续其它入口启用工具窗口后，之前的状态才可能显现，用户会误以为第一次点击失败。

## 修复思路

打开“我的提示词”前先唤醒工具窗口管理器，再调用 `openTool`。

落地方式：

- `Drawnix` 将现有 `enableToolWindows` 传给 `DeferredAIInputBar`。
- `DeferredAIInputBar` 继续传给 `AIInputBar`。
- `AIInputBar` 再传给 `PromptHistoryPopover`。
- `PromptHistoryPopover` 在点击“我的提示词”时先调用 `onBeforeOpenMyPrompts`，再 `openTool`。

这样入口不再依赖隐式全局状态，且复用已有工具窗口启用机制。

## 分类筛选经验

打开“我的提示词”时，要把当前生成类型作为 `componentProps.initialCategory` 传入：

```ts
toolWindowService.openTool(tool, {
  componentProps: {
    initialCategory: generationType,
  },
});
```

“我的提示词”工具接收 `initialCategory` 后：

- 初始化分类为对应类型。
- 复用已打开窗口时同步切换分类。
- 清空旧的搜索词和 Skill 筛选，避免上一次筛选污染当前入口。

## 日志定位经验

这类跨层 UI 问题要按状态流分层打点：

- 入口层：点击前后的 `getToolState`。
- 服务层：`openTool` 的 launchMode、复用/新建分支、实例状态。
- 渲染层：`ToolWinBoxManager` 是否收到对应状态。
- 工具栏层：最小化/常驻图标点击时的状态。

如果服务层显示 `status: open`，但渲染层没有日志，优先检查管理器是否启用，而不是继续追 `openTool`。

## 后续规则

- 轻量入口打开 WinBox 工具前，必须先启用工具窗口管理器。
- `openTool` 成功不代表 UI 已渲染，必须确认消费状态的管理器已挂载。
- 入口传业务上下文用 `componentProps`，不要用全局变量或窗口级临时状态。
- 复用窗口时要显式同步筛选条件，避免保留上一次入口的 UI 状态。
- 定位日志要分层、带 instanceId/status/isLauncher/isPinned，问题确认后再移除或降级。

## 回归检查清单

- 首次点击提示词选择器标题是否立即打开“我的提示词”窗口？
- 窗口已最小化时，再次点击标题是否恢复窗口？
- 当前生成类型为图片/视频/音频/文本/Agent 时，是否进入对应分类？
- 搜索词或 Skill 筛选是否不会污染下一次从选择器打开？
- 控制台是否能看到入口、服务层和 WinBox 管理器的状态链路？
