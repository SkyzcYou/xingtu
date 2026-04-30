## Context

当前生图反馈主要依赖 `WorkZone`：

- 提交时在画布中插入固定尺寸的卡片
- 卡片内部展示标题、状态、步骤列表与删除/隐藏按钮
- 自动插入完成后再删除卡片

这种设计适合表达工作流存在，但不适合表达“图片对象即将落入画布”的过程。问题主要有：

- 过程对象抢占画布注意力，打断创作空间
- 固定卡片高度在单图场景下留白过多
- 生图反馈的核心不是步骤明细，而是“会落在哪、会长成什么比例、现在到了哪个阶段”
- 当前状态同步分散在 `AIInputBar`、`useWorkflowSubmission`、`useTaskWorkflowSync`、`useAutoInsertToCanvas` 中，后续继续在 `WorkZone` 上叠交互会进一步放大复杂度

## Goals

- 让生图过程在画布中表现为“对象正在诞生”，而非“任务卡片正在执行”
- 优先利用提交时即可获得的几何信息，建立可信的一致性反馈
- 在结果未返回前，通过锚点表达位置、比例与状态，而不伪装已知内容
- 保留失败重试、详情追踪和恢复能力
- 首版只覆盖 `image` 类型任务，不改造其他任务类型

## Non-Goals

- 不在首版统一视频、音频、文本、流程图等其他任务反馈
- 不在首版默认引入强品牌化的传送门或粒子特效
- 不依赖结果侧稳定返回 `width/height` 元数据来决定首版锚点几何

## Decision

### 1. 生图改为 `Generation Anchor`

生图提交后，系统在预期插入位置创建轻量锚点，而不是默认创建大面积 `WorkZone` 卡片。

锚点的职责只有四类：

- 表达“已受理”
- 表达“预期落点”
- 表达“预期几何外壳”
- 表达“当前阶段 + 主动作”

步骤详情、历史记录、错误细节默认不在画布中展开。

### 2. 三档几何策略

#### `Frame-first`

若提交时已存在：

- `targetFrameId`
- `targetFrameDimensions`

则锚点直接继承 Frame 外壳，在该容器内部完成生成、显影与结果接管。

#### `Size-first`

若不存在 Frame，但已存在明确的 `size`，则使用 `size` 作为锚点外壳的比例来源。该策略与当前插入逻辑一致，因为首版插入已经依赖 `parseSizeToPixels(size)` 进行几何推导。

#### `Ghost-anchor`

若既无 Frame 又无稳定比例信息，则仅创建轻量出生点锚点，不伪装为完整图片框。待结果返回后，再从出生点平滑 morph 为真实图片。

### 3. 用户态状态机

生图锚点统一使用以下用户态：

- `submitted`
- `queued`
- `generating`
- `developing`
- `inserting`
- `completed`
- `failed`

状态解释：

- `submitted`: 用户点击后，任务已创建，输入条需要立即确认
- `queued`: 请求已受理但尚未进入明显执行
- `generating`: 模型正在生成结果
- `developing`: 结果已返回，正在准备插入或执行轻显影
- `inserting`: 正在把真实图片插入画布并与锚点连续过渡
- `completed`: 图片已稳定落位，锚点将短暂停留后淡出
- `failed`: 保留失败节点，允许重试或查看详情

#### 用户态文案规范

首版默认文案应保持“对象正在诞生”的语义，而不是暴露底层工作流术语：

- `submitted`: 已提交，等待执行
- `queued`: 请求已受理，等待执行
- `generating`: 图片正在生成，请稍候
- `developing`: 结果已返回，正在准备显影
- `inserting`: 正在放入画布
- `completed`: 图片已稳定落位
- `failed`: 生成失败，请重试

允许在特定交互瞬间使用更细的提示文案，例如：

- 主线程回退时：请求已受理，正在转入本地执行
- 用户点击重试时：正在重新触发，请稍候

但这些文案必须仍然映射回上述统一用户态，不允许新增平行状态名。

### 4. 详情层收敛

锚点默认只展示：

- 当前阶段文案
- 轻进度
- 一个主动作

详细步骤、错误明细、历史版本应进入任务详情层，而不是在画布中展开完整 `WorkZone`。

#### 职责边界

`Generation Anchor` 负责：

- 受理确认
- 预期落点
- 预期几何外壳
- 当前阶段
- 轻进度
- 当前上下文中的恢复动作

任务详情层负责：

- 完整步骤列表
- 错误详情与调试信息
- 历史记录与重试历史
- 批量结果管理
- 非画布主路径的任务追踪

画布中的锚点不应默认展开完整步骤列表，也不应承载需要持续滚动阅读的信息。

### 5. 渐进迁移

首版仅对 `image` 类型启用 `Generation Anchor`。

- `image`：默认启用 Anchor
- 其他类型：继续使用现有 `WorkZone` 或现有任务反馈

这样能避免一次性改造所有任务语义，也能降低对现有任务同步链路的影响。

## State Mapping

首版建议由一个统一的 view model 负责把现有信号映射成锚点状态：

- 提交态信号：
  - `expectedInsertPosition`
  - `targetFrameId`
  - `targetFrameDimensions`
  - `size`
- 任务执行信号：
  - `Task.status`
  - `Task.progress`
  - `Task.executionPhase`
- 后处理信号：
  - `workflowCompletionService`
  - 自动插入开始/完成事件

映射规则示例：

- 任务创建后但未进入稳定进度更新：`submitted`
- `TaskExecutionPhase.SUBMITTING`: `queued`
- `Task.progress` 持续推进：`generating`
- 任务已成功但后处理未完成：`developing`
- 图片正在落入画布：`inserting`
- 后处理完成并已插入：`completed`
- 任意执行或插入失败：`failed`

## UI Model

建议新增面向 UI 的锚点模型：

- `anchorType`: `frame | ratio | ghost | stack`
- `phase`
- `position`
- `dimensions`
- `progress`
- `title`
- `subtitle`
- `primaryAction`
- `secondaryAction`
- `transitionMode`

该模型只表达画布中锚点需要展示什么，不直接持有完整工作流对象。

## Integration Notes

- 输入条负责第一层反馈：点击后立即显示“已提交”
- 画布锚点负责第二层反馈：表达位置、比例、阶段
- 任务详情层负责第三层反馈：步骤明细、失败原因、历史记录
- 现有 `WorkZone` 首版可作为非生图路径保留，不与生图锚点混用

## Architecture Alignment

### Runtime Topology

首版推荐的运行时拓扑如下：

1. `AIInputBar`
   - 负责生图提交入口
   - 产出提交期几何上下文
   - 调用 `ImageGenerationAnchorTransforms.insertAnchor`
   - 触发输入条“已提交”反馈

2. `with-image-generation-anchor`
   - 负责 `generation-anchor` 元素的画布承载与渲染
   - 管理 anchor 元素的插入、更新、删除与命中

3. `useImageGenerationAnchorController`
   - 负责把原始信号映射为 UI model
   - 不直接写画布，只输出“应该显示什么”

4. `useImageGenerationAnchorSync`
   - 负责监听任务与后处理事件
   - 负责按 `taskId / workflowId` 找到 anchor
   - 负责把 controller 产出的状态回写到画布元素

5. `useAutoInsertToCanvas`
   - 负责真实图片落图
   - 负责驱动 `developing -> inserting -> completed`
   - 负责在插入完成后让 anchor 收口

6. `WorkZone`
   - 生图首版不再作为默认反馈
   - 仅保留给非生图任务与旧路径兼容

### Ownership Matrix

#### `AIInputBar`

拥有：

- `generationType === 'image'` 分流决策
- `expectedInsertPosition`
- `targetFrameId`
- `targetFrameDimensions`
- `requestedSize`
- `currentImageAnchorIdRef`
- 输入条首段反馈

不拥有：

- anchor 运行中阶段推进
- 刷新恢复
- 自动插入后的收口
- 全局任务同步

#### `Drawnix`

拥有：

- 注册 `with-image-generation-anchor`
- 挂载 `useImageGenerationAnchorSync`
- 在 board ready / task storage ready 后进行恢复协调

不拥有：

- 提交期几何推导
- 真实插入行为本身

#### `useImageGenerationAnchorSync`

拥有：

- 从 `taskQueueService`、`workflowCompletionService`、插入事件读取状态
- 根据 `taskId / workflowId` 查找 anchor
- 调用 transforms 更新 anchor 元素

不拥有：

- 具体 JSX 渲染
- 业务提交入口

#### `useAutoInsertToCanvas`

拥有：

- 结果 URL 到画布对象的真实插入
- 插入前后的 anchor 状态推进
- 插入失败到失败态的回写

不拥有：

- anchor 初次创建
- 输入条即时反馈

### Data Contracts

#### Submission Context

建议定义一个单独的提交期上下文对象，避免多个模块重复各自取值：

- `workflowId`
- `taskIds`
- `expectedInsertPosition`
- `targetFrameId`
- `targetFrameDimensions`
- `requestedSize`
- `prompt`
- `count`
- `createdAt`

来源：

- `AIInputBar`

用途：

- 创建 anchor
- 恢复定位
- 插入时兜底寻找几何上下文

#### Anchor View Model

建议定义一个稳定的 UI model，避免 JSX 直接依赖任务/工作流对象：

- `anchorType`
- `phase`
- `progressMode: 'indeterminate' | 'percent' | 'steps'`
- `progressValue`
- `title`
- `subtitle`
- `showFrameShell`
- `showRatioShell`
- `showGhostPulse`
- `canRetry`
- `canOpenDetails`
- `transitionMode: 'fade' | 'morph' | 'frame-fill' | 'stack-expand'`

### Runtime Sequence

#### 提交阶段

1. `AIInputBar` 解析生图请求
2. 推导 `expectedInsertPosition / Frame / size`
3. 构造 submission context
4. 创建 `generation-anchor`
5. 提交任务到工作流 / 任务队列

#### 执行阶段

1. `taskQueueService` 发出 `taskCreated / taskUpdated`
2. `useImageGenerationAnchorSync` 读取任务状态
3. `useImageGenerationAnchorController` 把 `Task.status / progress / executionPhase` 映射为 `submitted / queued / generating`
4. transforms 更新 anchor 元素

#### 后处理阶段

1. 任务成功返回结果 URL
2. `workflowCompletionService` 发出后处理开始
3. anchor 切到 `developing`
4. `useAutoInsertToCanvas` 开始插入
5. anchor 切到 `inserting`
6. 图片落图成功后，anchor 切到 `completed` 并收口

#### 失败阶段

1. 任务失败或插入失败
2. `useImageGenerationAnchorSync` / `useAutoInsertToCanvas` 写回失败态
3. anchor 保留失败节点
4. 用户可原位重试或打开详情

## Implementation Breakdown

### 1. 元素层拆分

首版不建议在现有 `workzone` 元素上继续追加“生图锚点”模式，而是新增独立的画布元素类型：

- `generation-anchor`

原因：

- `workzone` 语义是“工作流过程面板”
- `generation-anchor` 语义是“结果出生点”
- 两者在几何、交互密度、恢复逻辑和删除时机上都不同
- 生图首版需要与非生图路径并行存在，独立元素类型更利于渐进迁移

插件实现建议优先参考现有的轻元素模式，而不是继续沿用 `with-workzone` 的重型编排模式：

- 参考 `withCard` / `CardGenerator` 的 `foreignObject + React root + generator` 范式
- 参考 `withAudioNode` / `AudioNodeGenerator` 的“轻元素 + 实时状态渲染”模式
- 若后续需要手动缩放，再单独增加 resize companion plugin，参考 `with-card-resize` / `with-audio-node-resize`

不建议参考 `withTool` 的消息桥式重型模式，因为 anchor 不是一个 iframe 工具，也不应承担任务编排职责。

### 2. 建议新增文件

#### 类型层

- `packages/drawnix/src/types/image-generation-anchor.types.ts`

职责：

- 定义 `PlaitImageGenerationAnchor`
- 定义 `anchorType`
- 定义用户态 `phase`
- 定义提交期几何上下文与主动作字段

建议字段：

- `workflowId`
- `taskIds`
- `anchorType: 'frame' | 'ratio' | 'ghost' | 'stack'`
- `phase`
- `progress`
- `requestedSize`
- `expectedInsertPosition`
- `targetFrameId`
- `targetFrameDimensions`
- `resultUrl`
- `error`
- `zoom`

#### 渲染层

- `packages/drawnix/src/components/image-generation-anchor/ImageGenerationAnchorContent.tsx`
- `packages/drawnix/src/components/image-generation-anchor/image-generation-anchor.scss`
- `packages/drawnix/src/components/image-generation-anchor/index.ts`

职责：

- 渲染 `Frame Anchor`
- 渲染 `Ratio Anchor`
- 渲染 `Ghost-anchor`
- 渲染失败态与主动作

约束：

- 只做展示，不直接 claim / resume / 查询任务状态
- 不持有工作流恢复逻辑

#### 插件层

- `packages/drawnix/src/plugins/with-image-generation-anchor.ts`

职责：

- 注册 `generation-anchor` 元素
- 创建 `foreignObject`
- 管理激活态边框与点击命中
- 提供 transforms：
  - `insertAnchor`
  - `updateAnchorState`
  - `updateGeometry`
  - `removeAnchor`
  - `getById`
  - `getAnchorByTaskId`
  - `getAnchorByWorkflowId`
  - `getAllAnchors`

边界约束：

- 插件层只提供元素能力
- 不直接订阅 `taskQueueService`
- 不直接处理 workflow 恢复
- 不直接决定 anchor 何时完成或消失

#### 状态映射层

- `packages/drawnix/src/hooks/useImageGenerationAnchorController.ts`
- `packages/drawnix/src/utils/image-generation-anchor-view-model.ts`

职责：

- 将提交期几何信号 + 任务状态 + 后处理状态映射为 anchor UI model
- 统一决定：
  - `anchorType`
  - `phase`
  - `progress`
  - `title/subtitle`
  - `primaryAction`
  - `transitionMode`

关键原则：

- UI 不直接认 `taskQueueService`、`workflowSubmissionService` 或 `workflowCompletionService` 的原始对象
- UI 只认 `ImageGenerationAnchorController` 产出的 anchor view model
- controller 是 image anchor 的单一状态源

建议保持该层为纯映射或轻控制器，不直接操作 DOM。

#### 同步层

- `packages/drawnix/src/hooks/useImageGenerationAnchorSync.ts`

职责：

- 在 board 级别监听 `taskQueueService`
- 在 board 级别监听后处理 / 自动插入事件
- 在刷新恢复后重新同步 anchor 状态
- 将更新写回 `ImageGenerationAnchorTransforms`

边界约束：

- `sync` 只负责订阅和归一化原始事件
- `sync` 不直接做业务判断
- `sync` 允许重复事件、乱序事件和恢复事件
- `controller` 负责幂等推进和去重

该 hook 应由 `Drawnix` 持有，而不是由 `AIInputBar` 或单个 anchor 组件持有。

### 3. 现有文件改动范围

#### `AIInputBar.tsx`

保留职责：

- 判断当前是否是 `image` 类型提交
- 计算 `expectedInsertPosition`
- 解析 `targetFrameId / targetFrameDimensions`
- 计算 `requestedSize`
- 在提交时创建首个 anchor
- 提供输入条“已提交”即时反馈

移出职责：

- 不再负责生图默认大 `WorkZone` 创建
- 不再通过 `currentWorkZoneIdRef` 驱动生图的完整生命周期
- 不再直接订阅 `taskQueueService.observeTaskUpdates()`
- 不再直接订阅 `workflowCompletionService.observeCompletionEvents()`
- 不再直接基于 image 路径写 `WorkZoneTransforms.update/remove`

建议新增：

- `currentImageAnchorIdRef`

并保留现有：

- `currentWorkZoneIdRef`

作为非生图路径兼容。

#### `useAutoInsertToCanvas.ts`

新增职责：

- 根据 `taskId` 查找 image anchor
- 在“结果已返回但未插入”时切换到 `developing`
- 在“开始插入”时切换到 `inserting`
- 在“插入完成”时执行 anchor → image 的收口
- 在失败时更新为失败节点

需要替换的当前耦合：

- 现有 `findWorkZoneForTask`
- 现有基于 WorkZone 的 `expectedInsertPosition / targetFrameDimensions` 读取
- 现有生图完成后直接删除 WorkZone 的逻辑
- 现有依赖 `ai-generation-complete` 解锁输入条的生图路径

#### `drawnix.tsx`

新增职责：

- 注册 `with-image-generation-anchor`
- 挂载 `useImageGenerationAnchorSync`

保留职责：

- 现有 `WorkZone` 恢复与同步先只服务非生图路径

建议调整：

- 让 `Drawnix` 成为 image anchor 的全局恢复入口
- 不再让 `AIInputBar` 持有刷新恢复或跨任务同步逻辑
- 现有 `restoreWorkZones`、workflow sync、task queue sync 中的 image 逻辑应迁移到 anchor sync，而不是继续直接写 WorkZone

#### `useWorkflowSubmission.ts`

建议调整：

- 将 image 类型从“默认 WorkZone 同步路径”中分流出来
- 保持文本、Agent、非生图任务继续复用现有逻辑

说明：

生图首版的主要状态源更应该是：

- 提交期几何上下文
- `taskQueueService`
- 后处理 / 插入事件

而不是完整 `workflow` 步骤列表。

需要重点清理的耦合：

- 当前把 workflow 事件直接同步到 WorkZone 的分支
- 当前把 image 路径当成默认 workflow 面板处理的分支

#### `with-workzone.ts` / `WorkZoneContent.tsx`

首版策略：

- 保留
- 不扩展生图主路径
- 仅服务非生图任务与兜底流程

后续可选策略：

- 当 image anchor 稳定后，再把生图相关分支从 WorkZone 中逐步收缩或删除

### 4. 状态层职责划分

建议把状态划成三层：

#### 提交期几何状态

来源：

- `AIInputBar`
- 选区 / Frame
- `size`

职责：

- 决定 anchor 初始位置与外壳类型
- 是 `AIInputBar` 唯一应长期保有的 image 特有语义

#### 任务执行状态

来源：

- `taskQueueService`
- `Task.progress`
- `Task.executionPhase`

职责：

- 决定 `submitted / queued / generating`
- 是任务生命周期的唯一执行真相，不直接决定最终收口

#### 后处理 / 插入状态

来源：

- `workflowCompletionService`
- `useAutoInsertToCanvas`

职责：

- 决定 `developing / inserting / completed / failed`
- 用于避免“任务已完成但图片尚未真正落图”时提前收口

### 5. 单一状态源约束

对于 image anchor，必须明确以下 ownership 约束：

- `AIInputBar` 只拥有提交瞬间快照，不拥有持续运行态
- `WorkflowContext` / `workflowSubmissionService` 只拥有 workflow 计划真相，不拥有 anchor UI 真相
- `taskQueueService` 只拥有任务执行真相
- `workflowCompletionService` 只拥有后处理真相
- `ImageGenerationAnchorController` 拥有唯一的 anchor 运行态

任何直接绕过 controller 写入 anchor UI 状态的路径，都视为架构违规。

### 6. 迁移顺序

推荐按以下顺序推进，避免双系统互相打架：

1. 新增 anchor 类型、plugin 与 view model
2. 在 `AIInputBar` 中仅对 `image` 路径创建 anchor
3. 在 `useAutoInsertToCanvas` 中接入 anchor 查找与完成态收口
4. 在 `Drawnix` 中增加 anchor 同步 / 恢复 hook
5. 将 image 路径从默认 `WorkZone` 更新链中分流
6. 手工验证稳定后，再考虑清理 WorkZone 中的 image 分支

### 7. 为什么不复用 `WorkZone`

不推荐直接把 `WorkZoneContent` 改成“生图锚点样式”的主要原因：

- 仍会保留错误的元素语义
- 仍会把大量工作流字段塞进画布元素
- 仍会让生图依赖当前分散的 WorkZone 同步链
- 会增加“单组件承担展示 + 恢复 + 兜底编排”的复杂度

独立元素类型虽然首版工作量更高，但长期边界更清晰。

## Audit And Review Plan

### 代码层重点审计

- 是否仍有 image 路径写入 `WorkZoneTransforms`
- 是否存在 anchor 与 WorkZone 对同一 image 任务双写
- 是否有组件直接读取 `taskQueueService` 并绕过 controller
- 是否把恢复逻辑重新塞回展示组件
- 是否在未知比例场景下错误创建完整比例框
- 是否仍沿用 `ai-generation-complete` 作为 image 路径的唯一解锁信号

### 迁移层重点审计

- `AIInputBar` 创建 image anchor 后，是否仍然默认创建 WorkZone
- `useAutoInsertToCanvas` 是否还依赖 `findWorkZoneForTask`
- `drawnix.tsx` 的 WorkZone 恢复逻辑是否误处理 image anchor
- `useWorkflowSubmission` 是否仍将 image 事件同步到 WorkZone
- `useTaskWorkflowSync` 是否仍把 image 任务 fallback 到 WorkZone
- 是否仍存在多个 `setTimeout(1500)` 竞争删除同一 image 反馈对象

### 手工验证重点

- 选中 Frame 的单图生图
- 指定 `size` 的单图生图
- 不指定 `size` 的单图生图
- 同 prompt 多图生成
- 失败后原位重试
- 刷新页面后的锚点恢复
- 自动插入完成后的收口行为

### Code Review 必查文件

- `packages/drawnix/src/components/ai-input-bar/AIInputBar.tsx`
- `packages/drawnix/src/hooks/useAutoInsertToCanvas.ts`
- `packages/drawnix/src/drawnix.tsx`
- `packages/drawnix/src/hooks/useWorkflowSubmission.ts`
- `packages/drawnix/src/hooks/useTaskWorkflowSync.ts`
- `packages/drawnix/src/plugins/with-workzone.ts`
- `packages/drawnix/src/plugins/with-image-generation-anchor.ts`
- `packages/drawnix/src/services/workflow-completion-service.ts`
- `packages/drawnix/src/services/task-queue-service.ts`

## Risks

- 若锚点状态映射继续分散在多个 hook 与组件中，会重新产生“多处同步”的维护问题
- 若在未知比例时仍强制生成完整图片框，会造成锚点与最终结果不一致
- 若首版同时覆盖多任务类型，会让锚点语义被稀释，增加复杂度

## Mitigations

- 首版限制在 `image` 类型
- 将状态映射收敛到单一 view model / controller
- 将几何策略明确为 `Frame-first / Size-first / Ghost-anchor`
- 保留现有 `WorkZone` 给非生图路径，降低迁移风险
