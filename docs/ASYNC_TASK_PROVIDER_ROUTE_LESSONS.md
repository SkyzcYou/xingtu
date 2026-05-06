# 异步任务供应商路由经验

更新日期：2026-05-05

## 背景

图片、视频、音频异步任务都有“提交任务 -> 保存远端任务 ID -> 后续查询状态”的链路。多供应商接入后，提交时使用的供应商不一定等于用户刷新页面后的默认供应商。

这次 HappyHorse 用户反馈的错误是：

- 状态查询失败
- 接口返回“该令牌无权访问模型”
- request id: `202605020707307592757188268d9d67zVDq7SC`

## 根因

异步任务只保存 `remoteId` 不够。

如果任务恢复查询时只依赖当前 `task.params.model`、当前默认供应商，或当前全局 API Key，就会出现：

- 提交任务用的是供应商 A 的 key
- 刷新后默认路由切到了供应商 B
- 查询状态时拿供应商 B 的 key 去查供应商 A 的任务
- 服务端返回模型无权限、任务不存在或鉴权失败

这不是 HappyHorse 单模型问题，而是多供应商异步任务的通用一致性问题。

## 修复规则

### 1. 异步任务必须绑定创建时路由

任务进入异步轮询阶段时，必须保存轻量 `invocationRoute` 快照：

- `operation`: image / video / audio / text
- `providerProfileId`
- `providerType`
- `modelId`
- `modelRef`
- `binding` 的协议、请求/响应 schema、提交路径、轮询路径模板

不要保存 API Key。恢复查询时应通过 `providerProfileId` 找当前配置里的最新 key。

### 2. 恢复查询必须优先使用任务路由

恢复查询时优先级应是：

1. `task.invocationRoute`
2. 兼容旧任务的 `task.params.modelRef`
3. 最后才是 `task.params.model` 或默认路由

只要任务上存在 `providerProfileId`，就进入严格模式，不允许静默 fallback 到默认供应商。

### 3. 严格模式要显式失败

以下情况应直接给出配置错误，而不是换默认 key 继续查：

- 原供应商配置已删除
- 原供应商被停用
- 原供应商 API Key 缺失
- 原供应商 Base URL 缺失
- 原模型 binding 已不可用

这样用户看到的是“原供应商配置不可用”，而不是误导性的“令牌无权访问模型”。

### 4. 查询路径也属于供应商 binding

视频状态查询不能硬编码一种路径。不同供应商可能需要：

- `/videos/{taskId}`
- `/kling/v1/videos/{action}/{taskId}`
- 其他自定义 poll path

轮询路径应来自 binding 的 `pollPathTemplate`，并支持用任务参数填充 `{taskId}`、`{action}` 等占位符。

### 5. 同步和恢复必须 round-trip

`invocationRoute` 必须覆盖这些路径：

- IndexedDB 写入与读取
- 内存 task queue 同步
- 外部任务追踪
- fallback executor
- 主线程 resume
- GitHub sync compact / restore
- SW channel 类型

如果某条链路漏掉字段，刷新或远程同步后仍会回到默认供应商查询。

### 6. 异步图片恢复判定不能只依赖模型白名单

刷新恢复时，只要异步任务已经拿到远端任务 ID，就应该优先恢复轮询，而不是直接标记为“页面刷新中断”。

图片任务尤其容易踩坑：动态供应商模型不一定在内置 `ASYNC_IMAGE_MODEL_IDS` 白名单里，但任务创建时已经持久化了 `invocationRoute.binding`。因此恢复判定应满足：

- 任务类型是 image
- 已有 `remoteId`
- 模型命中内置异步图片白名单，或 `invocationRoute.binding` 表明它是 `openai.async.media` / `openai.async.image.form`

这样页面刷新后，UI 会继续显示生成中并由执行器恢复轮询；只有真正的业务终态失败才进入失败界面。

不要为了隐藏错误去改 UI。失败界面只是任务状态的投影，根因应在任务恢复层修正。

## 代码落点

- `task-invocation-route.ts`：创建、解析、严格校验任务路由快照。
- `core.types.ts`：任务模型增加 `invocationRoute`。
- `task-queue-service.ts`：创建任务、外部任务、storage sync 写入路由快照。
- `generation-api-service.ts` / `useTaskExecutor.ts`：image/audio/video 恢复查询优先用任务路由，并在严格模式下校验原供应商。
- `task-utils.ts`：集中判断异步图片任务是否可恢复，避免 storage 和 executor 使用不同条件。
- `fallback-executor.ts`：fallback 视频恢复查询使用原供应商。
- `video-binding-utils.ts`：统一视频状态查询路径模板。
- `github-sync`：远程同步保留 `invocationRoute`。

## 验证清单

- 异步任务提交后，storage 中应有 `remoteId` 和 `invocationRoute`。
- 刷新页面后恢复 image/audio/video 任务时，请求应命中原 `providerProfileId` 对应的 key。
- 修改默认供应商后，旧异步任务仍应使用原供应商查询。
- 删除或停用原供应商后，任务应失败为明确配置错误，不应切到默认 key。
- 自定义 `pollPathTemplate` 的视频供应商应按模板查询状态。
- 动态异步图片模型即使不在内置白名单，只要保存了 async image binding 和 `remoteId`，刷新后也应继续轮询。

## 经验规则

- 异步任务的远端 ID 只在原供应商上下文中有意义。
- 多供应商系统里，“模型名”不是稳定路由键；稳定键应包含供应商 ID 和模型 ID。
- 不要把 API Key 持久化进任务；持久化供应商 ID，查询时读取当前 key。
- 新增异步供应商时，必须同时补提交路径、轮询路径、恢复路径和同步路径测试。
- 任何状态恢复逻辑都要警惕静默 fallback，它会把配置问题伪装成模型权限问题。
- UI 失败态不应作为异步中断兜底；先确认任务是否已有可轮询的远端 ID。
