# Retry Image Component Lessons

## 背景

图片生成任务完成后，远端文件或本地虚拟缓存路径可能短时间不可读，直接使用 `<img>` 会出现一次性加载失败的破图。任务队列已有 `RetryImage`，但其他生成图展示入口仍散落使用原生 `<img>` 或 CSS `background-image`。

## 经验

- 生成结果图统一使用公共 `RetryImage`，不要在各页面重复写 `onError` 重试。
- `RetryImage` 的失败通知应在重试耗尽后触发，避免外层第一次 `onError` 就切到失败占位。
- 列表、缩略图、画廊等紧凑 UI 默认关闭 skeleton，直接保持原 `<img>` 布局，避免额外 wrapper 撑乱尺寸。
- 需要 `ref/onLoad` 的媒体预览主图，可以通过 `forwardRef` 接入 `RetryImage`，保留自适应缩放逻辑。
- CSS `background-image` 不会触发组件重试，生成锚点这类背景预览要改成真实图片节点。
- 素材库类长列表仍应保留懒加载；可在 `LazyImage` 进入视口后下沉复用 `RetryImage`，兼顾性能和容错。
- 视频封面已有 `VideoPosterPreview` 专用重试逻辑，不必强行替换。
- 用户上传预览、本地帧图、品牌图标、画布内部图片元素不属于“生成后短时间不可读”的主风险面，除非出现实际问题，不应扩大替换范围。

## 替换优先级

1. 任务结果缩略图、批量生图预览、生成历史。
2. 工作流首尾帧、角色参考图、漫画/PPT/Markdown 生成图。
3. 媒体预览主图和缩略图队列。
4. 素材库和提示词历史中的生成图复用入口。

## 验证建议

- 跑 `pnpm nx run drawnix:typecheck`。
- 跑图片任务重试相关测试。
- 检查紧凑缩略图容器是否因 wrapper 发生尺寸变化。
- 搜索剩余 `<img>` 时按来源判断，不要机械替换所有图片节点。
