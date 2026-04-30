# Change: Add Comic Strip Generator

## Why
- 用户需要一个独立的「连环画生成」工具，把故事文本稳定拆解为可编辑分镜，并批量生成多张风格一致的图片。
- 现有图片生成能力偏单张结果，缺少跨页提示词规划、公共提示词复用、历史追踪和多格式导出闭环。
- 连环画生成涉及批量图片与导出，必须先定义内存与并发边界，避免在高并发文件处理场景中持久化大对象或触发峰值内存占用。

## What Changes
- 新增能力 `comic-generation-workflow`，提供独立工具「连环画生成」。
- 支持提示词规划，把用户故事拆分为公共提示词与每页提示词，并允许编辑公共提示词和单页提示词。
- 支持串行与并行图片生成模式，带有队列状态、失败重试、取消和局部重生能力。
- 支持轻量历史记录，保存项目元数据、提示词、生成状态和结果引用，不持久化大图或 base64。
- 支持 ZIP、PPTX、PDF 导出，并要求导出阶段按引用 fetch 图片，采用限流或串行处理以控制内存峰值。

## Impact
- Affected specs: `comic-generation-workflow`
- Affected code: `packages/drawnix/src/tools`, `packages/drawnix/src/services/tool-window-service`, image generation task adapters, export utilities, lightweight local history storage
