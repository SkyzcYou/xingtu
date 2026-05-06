# AI 生成参数收口经验

## 背景

AI 输入框、AI 图片生成弹窗、AI 视频生成弹窗都会选择模型并配置模型参数。之前弹窗内存在独立参数 UI 和独立偏好存储逻辑，导致同一个模型在不同入口看到的参数不一致。

本次修复将图片、视频弹窗的模型参数对齐到 AI 输入框参数体系，避免后续新增模型参数时多处维护。

## 问题表现

- AI 图片生成弹窗缺少 AI 输入框里的模型参数配置。
- AI 视频生成弹窗仍使用独立的 `VideoModelOptions` 管理 `duration` 和 `size`。
- 弹窗偏好与 AI 输入框偏好分开保存，切换入口后参数容易丢失或回退。
- 半迁移状态下，移除了 import 但 JSX 仍渲染 `VideoModelOptions`，会触发 `ReferenceError: VideoModelOptions is not defined`。

## 修复思路

- 统一参数入口：弹窗复用 `ParametersDropdown`，不再为 `duration`、`size` 单独维护 UI。
- 统一状态模型：视频弹窗用单一 `videoSelectedParams` 保存 `duration`、`size` 和 provider 参数。
- 统一偏好桥接：工具弹窗保存时同步回 AI 输入框 scoped params；弹窗加载时优先读取 AI 输入框同模型参数。
- 保持队列协议兼容：创建视频任务前再把 `duration`、`size` 从统一参数对象拆出，继续写入 `seconds`、`size`，剩余参数写入 `params`。

## 代码结构

- `ParametersDropdown` 增加 `placement`，输入框默认向上展开，弹窗内向下展开。
- 图片弹窗把尺寸参数也纳入 `ParametersDropdown`，不再单独维护 aspect ratio selector。
- 视频弹窗移除 `VideoModelOptions` 依赖，使用 `getEffectiveVideoCompatibleParams` 获取完整参数列表。
- `ai-generation-preferences-service` 负责图片/视频工具偏好与 AI 输入框 scoped params 的双向同步。
- 单测覆盖图片和视频的“输入框优先读取”与“弹窗保存回写”。

## 经验规则

- 同一类模型参数只能有一个权威配置源，优先复用 `model-config` 和绑定工具函数。
- 弹窗、输入框、任务编辑都应读写同一份 selected params，再在提交任务时适配下游协议。
- 删除旧组件引用时必须同时清理 import、JSX、state、effect、测试预期。
- 参数迁移要补双向测试：入口 A 保存后入口 B 能读到，入口 B 保存后入口 A 能读到。
- 旧任务恢复要兼容历史字段，例如视频任务的 `seconds`、`duration`、`size` 和 `params`。

## AI 输入栏底栏布局补充

AI 输入栏底栏同时承载上传、知识库、生成类型、Skill、模型、参数、数量和发送按钮。参数和模型文案会随模型能力增长变长，不能让它们和发送按钮平级抢空间。

- 发送按钮是主操作，必须固定在最右侧并保留硬宽度，不能进入横向滚动或被容器裁掉。
- 工具入口可固定在左侧，中间的类型、模型、参数、数量应放进可收缩控制区，使用 `min-width: 0`、文本省略和窄屏隐藏次要标签兜底。
- 参数摘要属于辅助信息，可以被压缩成短标签或只保留图标；发送按钮、上传入口这类操作按钮不能被参数摘要挤走。
- 外层底栏不要整体 `overflow: hidden`，否则容易裁掉非 Portal 的浮层；只在中间控制区限制溢出。
- 修改紧凑控制条时至少检查：常规图片模式、Agent 多模型模式、长模型名、长参数摘要、移动端窄宽度下发送按钮是否始终可见。

## 验证

- `pnpm --dir packages/drawnix exec vitest run src/services/__tests__/ai-generation-preferences-service.test.ts src/constants/__tests__/model-config.test.ts`
- `pnpm --dir packages/drawnix exec tsc --noEmit -p tsconfig.lib.json`
- `git diff --check`
