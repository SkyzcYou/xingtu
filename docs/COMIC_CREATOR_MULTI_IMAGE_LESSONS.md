# 连环画多图生成经验总结

这份文档沉淀 2026-04-30 这轮连环画多图生成、任务队列回填和素材库兜底的排查经验。

## 背景

连环画生成支持“每页生成多张候选图”，同时串行模式会用上一页图片做连续性参考。用户反馈两个现象：

- 任务队列里已经生成 12 张图，但连环画页内只显示 6 张。
- 图片预览区需要素材库兜底，万一回填丢失，可以从素材库找回图片补到当前页。

## 问题表现

### 1. “页数”和“图片数”混在一起

每页生成 2 张时，6 页会产生 12 张图片，但页面进度如果只看“有图的页数”，就只能看到 6。

经验：

- `generated page count` 表示多少页已经至少有一张图。
- `generated image count` 表示所有页候选图总数。
- UI 文案必须同时呈现两者，不能用一个数字承载两种语义。

### 2. 队列模式里 `count` 被重复消费

队列模式已经会把顶层 `count=2` 展开成多个任务。如果创建队列任务时又把同一个 `count` 透传成模型 adapter 的 `n=2`，就会变成：

- 队列创建 2 个任务
- 每个任务又让模型生成 2 张
- 实际产物和 UI 预期不一致

经验：

- 顶层 `count` 是任务编排参数。
- adapter 内的 `n/count` 是模型调用参数。
- 同一次生成链路中只能有一层消费批量语义。

### 3. 串行参考图只适合串行模式

串行生成时，第 N 页可以带上：

- 用户上传的公共参考图
- 第 N-1 页当前选中的图片

并行生成时不能依赖上一页，因为上一页可能还没生成完。

经验：

- 串行模式：`referenceImages = 公共参考图 + 上一页 imageUrl`
- 并行模式：`referenceImages = 公共参考图`
- 上一页参考图必须读最新记录里的 `imageUrl`，不要读闭包里的旧 page 对象。

### 4. 任务回填要支持多候选图

图片任务结果可能是单图 `url`，也可能是多图 `urls`。连环画页不能只保存一个 `imageUrl`，还要维护候选图列表。

经验：

- `imageVariants` 是每页候选图列表。
- `imageUrl` 是当前选中的图片，用于预览、导出和下一页串行参考。
- 回填时追加候选图并按 URL 去重，避免重复任务结果污染列表。

### 5. 素材库兜底要贴近丢图现场

如果回填链路丢了，用户最自然的恢复位置就是当前页预览区，而不是离开流程去素材库里找。

经验：

- 每页预览区下方保留一个素材库入口。
- 素材库以 `SELECT` 模式打开，并限制为图片素材。
- 选中图片后只保存素材 URL 到当前页候选图，不复制大对象或 base64。
- 补回成功后把当前页状态置为 `succeeded`，清理旧错误。

## 代码结构

- `packages/drawnix/src/components/comic-creator/ComicCreator.tsx`
  - 串行模式带上一页图片作为参考。
  - 每页预览区增加素材库兜底入口。
  - 素材库选图后追加到当前页候选图。
- `packages/drawnix/src/components/comic-creator/utils.ts`
  - 区分已生成页数和已生成图片数。
  - 统一追加、去重和选择候选图。
- `packages/drawnix/src/components/comic-creator/task-sync.ts`
  - 从任务结果构建一组候选图并回填到对应页。
- `packages/drawnix/src/mcp/tools/image-generation.ts`
  - 队列模式不再把顶层 `count` 透传成 adapter `n/count`。
  - 队列任务保留连环画记录和页 ID 元数据，方便异步回填。
- `packages/drawnix/src/components/task-queue/TaskItem.tsx`
  - 批量序号兼容 0-based 和 1-based 来源，避免显示成 `3/2`。

## 经验规则

- 多图生成里，“任务数”“页数”“图片数”必须分开命名、分开统计、分开展示。
- 队列参数和模型参数要划清边界，批量语义只能被消费一次。
- 串行连续性参考只能使用已生成的上一页当前图，并行模式不要假装有上一页。
- 多候选图结构要以 URL 轻量引用为主，避免把大文件或 base64 写进状态。
- 补救入口要放在用户发现问题的位置，减少恢复成本。

## 验证

- `pnpm --dir packages/drawnix exec vitest run src/components/comic-creator/utils.test.ts src/mcp/tools/__tests__/image-generation.test.ts --no-file-parallelism --maxWorkers=1`
- `pnpm --dir packages/drawnix exec tsc --noEmit --pretty false --project tsconfig.lib.json`
- `git diff --check`
