# PPT 标题与导出文件名经验

更新日期：2026-04-27

## 背景

PPT 大纲生成后，AI 返回的总标题只存在于 `PPTOutline.title` 和返回结果里，没有稳定落到 PPT Frame 元数据。大纲视图只能看到每页标题，下载 PPT 时入口又固定传 `aitu-ppt`，导致用户无法在导出前确认或修改最终文件名。

## 经验

### 1. 总标题应跟随 PPT 元数据，而不是只存在于生成结果

`outline.title` 是整套 PPT 的业务标题，应写入轻量字段 `pptMeta.deckTitle`。每个 PPT Frame 都保存一份，方便从任意页面恢复，不需要新增 PPT 实体或额外存储表。

### 2. 大纲视图是编辑标题的自然入口

标题输入框放在 PPT 大纲视图顶部、公共提示词上方。用户生成大纲后先确认总标题，再确认公共提示词和每页提示词，编辑顺序更符合实际工作流。

### 3. 导出文件名要使用明确优先级

导出 PPT 时按以下顺序取名：

1. PPT 标题输入框
2. 当前画布标题
3. `aitu-ppt`

这样既尊重用户显式输入，也能在旧数据没有 `deckTitle` 时得到可读文件名。

### 4. 画布标题从上层透传，避免 UI 组件直接耦合工作区服务

`FramePanel` 已经由 `ProjectDrawer` 渲染，而 `ProjectDrawer` 持有 `currentBoard`。把 `currentBoard?.name` 作为 prop 传入，比在 `FramePanel` 内直接读取 `workspaceService` 更清晰，也更利于后续测试。

### 5. 文件名必须做轻量清洗

用户标题可能包含 `/ \ : * ? " < > |` 或控制字符。导出服务应在补 `.pptx` 前统一清洗非法字符，并为空值回退到 `aitu-ppt`，避免浏览器下载名异常。

## 实现要点

- 在 `PPTFrameMeta` 增加 `deckTitle?: string`。
- `generate_ppt` 创建 PPT Frame 时，把 `outline.title` 写入 `pptMeta.deckTitle`。
- `FramePanel` 从有序 PPT Frame 中读取第一个非空 `deckTitle` 初始化标题输入框。
- 标题输入框失焦、批量生图前、导出前，都把标题同步写回所有 PPT Frame。
- 导出入口不再固定传 `aitu-ppt`，而是使用 `标题输入框 > 画布标题 > aitu-ppt`。
- `FramePanel` 的导出文件名 helper 负责清洗非法文件名字符，导出服务继续负责补 `.pptx`。

## 注意事项

- 不要为了总标题新增独立 PPT 实体；当前 PPT 编辑能力仍以 Frame 和 `pptMeta` 为核心。
- 不要从每页 `slidePrompt` 反解析标题，提示词是给模型看的文本，不适合作为结构化数据源。
- 不要把文件名写入 analytics metadata，避免泄露用户标题；如需埋点，用已有 prompt summary 机制。
- 只清洗文件名，不修改用户输入框里的标题文本，避免用户看到的标题被意外改写。

## 检查清单

- 生成 PPT 大纲后，标题输入框自动填入 AI 返回的总标题。
- 修改标题后切换视图或导出，`pptMeta.deckTitle` 会同步到所有 PPT 页面。
- 标题为空时，下载文件名回退到画布标题。
- 标题和画布标题都为空时，下载文件名为 `aitu-ppt.pptx`。
- 标题含非法文件名字符时，下载名不会破坏 `.pptx` 后缀。
