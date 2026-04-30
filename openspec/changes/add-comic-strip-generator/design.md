## Context

「连环画生成」是面向多页图片的独立创作工具。它需要把一段故事拆成可控分镜，再把公共风格、角色设定、画幅和每页情节组合为多次图片生成请求。与普通单图生成相比，它的主要风险是批量任务、历史恢复和导出阶段可能产生高并发网络请求、大图持久化或内存峰值。

## Goals / Non-Goals

- Goals:
  - 提供独立工具入口，能力名为 `comic-generation-workflow`
  - 支持故事到分镜提示词规划，并允许公共提示词与单页提示词分别编辑
  - 支持串行和并行图片生成，保留可观察、可取消、可重试的队列状态
  - 支持轻量历史记录和 ZIP/PPTX/PDF 导出
  - 明确内存约束：不持久化大图/base64，导出按引用 fetch 并限流或串行
- Non-Goals:
  - 本次不要求实现复杂分镜排版编辑器或画布级漫画排版
  - 本次不要求提供角色一致性训练、LoRA 管理或跨模型风格迁移
  - 本次不把导出的 ZIP/PPTX/PDF 作为长期历史附件持久化

## Decisions

- Decision: 使用两阶段工作流

  - 阶段一为提示词规划，产出 `commonPrompt` 与 `pages[]`
  - 阶段二为图片生成，按每页 `commonPrompt + pagePrompt` 提交图片任务
  - 用户可以在生成前编辑公共提示词、单页提示词、页序和页数

- Decision: 公共提示词和单页提示词分开存储

  - 公共提示词承载画风、角色、镜头语言、统一负面约束和画幅
  - 单页提示词承载当前页剧情、动作、对白提示和构图重点
  - 生成请求阶段才组合最终提示词，避免历史记录中产生大量重复长文本

- Decision: 生成队列必须有明确并发边界

  - 串行模式按页序一张一张生成，适合强调连续性和低资源占用
  - 并行模式使用小并发上限，适合快速探索，但仍通过队列调度限制同时运行任务
  - 已完成页面只保存结果引用和轻量预览元数据，不复制原始大图

- Decision: 历史记录只保存可恢复的轻量状态

  - 保存标题、创建/更新时间、规划文本、页列表、模型参数、任务状态、错误摘要和结果 URL/asset id
  - 不保存原图二进制、大图 data URL、base64、完整响应体或批量导出文件
  - 历史恢复时按引用加载预览，引用失效时展示可重生或重新导出的状态

- Decision: 导出采用流式/限流资源处理

  - ZIP 导出逐页 fetch 图片并写入压缩包条目，避免先把全部图片读入数组
  - PPTX/PDF 导出按页拉取图片并及时释放中间对象
  - 所有导出默认串行或低并发 fetch，失败时停止或标记失败页，不扩大内存占用

## Data Shape

```ts
type ComicProject = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  commonPrompt: string;
  generationMode: "serial" | "parallel";
  concurrencyLimit: number;
  modelConfig: {
    providerId: string;
    modelId: string;
    aspectRatio?: string;
    size?: string;
  };
  pages: ComicPage[];
};

type ComicPage = {
  id: string;
  index: number;
  title?: string;
  prompt: string;
  locked?: boolean;
  status: "draft" | "queued" | "running" | "succeeded" | "failed" | "cancelled";
  resultRef?: {
    url?: string;
    assetId?: string;
    thumbnailUrl?: string;
  };
  error?: string;
};
```

## Risks / Trade-offs

- 风险: 并行生成导致供应商限流或本地内存峰值
  - Mitigation: 并行模式必须使用并发上限，并允许回退到串行生成

- 风险: 历史记录把图片 base64 写入本地存储
  - Mitigation: 历史 schema 明确禁止大图/base64，仅保存引用和轻量元数据

- 风险: 导出多页 PPTX/PDF 时一次性读入全部图片
  - Mitigation: 导出实现必须逐页 fetch，串行或限流处理，并在写入后释放临时对象

- 风险: 重新规划覆盖用户手动修改
  - Mitigation: 支持锁定页面和保留已编辑字段，重新规划只更新未锁定草稿

## Open Questions

- 并行生成默认并发上限是 2 还是跟随供应商配置动态决定
- 历史图片引用过期后是否提供一键批量重生
- PPTX/PDF 是否需要额外支持封面页和目录页
