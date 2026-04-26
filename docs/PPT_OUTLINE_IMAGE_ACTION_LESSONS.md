# PPT 大纲图片入口经验

## 背景

PPT 大纲视图每页只有提示词和优化入口。用户在编辑提示词时，无法快速判断这一页是否已经生成过图片，也不能直接从大纲页预览当前生效的 PPT 图片。

## 经验

- 大纲视图应复用画布里的当前生效图片状态，不额外维护一份图片实体。
- 当前生效图以 `findPPTSlideImage(board, frame.id)` 为准，优先使用 `pptMeta.slideImageElementId`，再回退到标记过的 PPT 图片或 `pptMeta.slideImageUrl`。
- 缩略图只展示 URL，不读取原图数据；小图通过 `useThumbnailUrl` 延迟获取，避免在列表渲染时做大图解码。
- hover 大图适合复用 `HoverCard`，比在列表中常驻大图 DOM 更轻，也能保持大纲列表滚动性能。
- icon、缩略图和提示词优化按钮属于同一页的快捷操作，应放在页面标题行右侧，避免挤占提示词编辑区。

## 实现要点

- 无图时显示 AI 图片生成 icon，点击沿用 `handleRegenerateSlide` 打开图片生成弹窗。
- 有图时显示当前生效图片的小缩略图，hover 后展示大图预览。
- 图片生成中、失败、禁用状态只通过轻量 class 表达，不引入新状态源。
- 大图预览使用 `loading="lazy"` 和 `decoding="async"`，减少主线程压力。

## 注意事项

- 不要把 base64 或 Blob 内容复制到 React state 中，列表态只传 URL。
- 不要新增 PPT 图片状态表，避免和 `pptMeta` / 画布元素产生双写不一致。
- 不要让原生 `title` 和自定义 hover 预览同时出现，避免浮层干扰。
- 批量生成时按钮禁用即可，底层任务流仍由现有 PPT 生图队列控制。
