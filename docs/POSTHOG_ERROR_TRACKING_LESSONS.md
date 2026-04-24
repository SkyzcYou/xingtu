# PostHog Error Tracking 修复复盘

这份文档沉淀 2026-04-22 这轮线上异常治理的经验，目标不是“把报错清空”，而是把真正影响用户的问题修掉，把用户取消操作或浏览器权限限制带来的噪音降下来，同时避免误关未定位的问题。

## 一、这轮处理了什么

### 1. 真问题优先修

本轮优先处理的是 3 类明确会影响用户体验的异常：

- `crypto.randomUUID is not a function`
- `Cannot read properties of undefined (reading 'type')`
- `DataError: No key or key range specified`

对应修法：

- UUID 生成改成多级 fallback，兼容不支持 `crypto.randomUUID()` 的环境
- 镜头卡片、时间轴等 UI 对脏数据做空值容错，避免 `shot.type`、`startTime`、`endTime` 直接炸掉
- IndexedDB 读取/删除前先校验 key，空 key 直接短路返回，不再把输入脏值放大成异常

经验：

- Error tracking 里最值得先修的，不是“报得最多”的，而是“用户一走到这个路径就会坏”的
- 对存储层和 UI 展示层同时补防线，通常比只在一个点打补丁更稳

### 2. 用户主动取消，不该算异常

这轮确认有一批错误本质是“用户取消了文件选择 / 保存 / 授权”，例如：

- `AbortError`
- 剪贴板 `NotAllowedError`

这类情况不是功能坏了，而是浏览器按安全策略拒绝，或者用户主动取消。

对应修法：

- `fileOpen` / `fileSave` 调用点捕获 `AbortError`，直接返回，不再继续抛
- 剪贴板统一走 helper，优先原生 API，失败后回退到 `execCommand('copy')`
- `crash-logger` 层过滤 `AbortError`、`NotAllowedError` 和明确的空 key `DataError`

经验：

- “用户取消” 和 “代码异常” 必须在采集层分开
- 越靠近上报入口做噪音过滤，越能减少 PostHog 指纹污染
- 但过滤条件要窄，避免把真实问题一并吞掉

### 3. 同类能力要收敛成公共 helper

这轮不是只改一个调用点，而是把容易出问题的底层能力统一收口：

- UUID 统一走 `generateUUID`
- 剪贴板统一走 `copyToClipboard` / `readFromClipboard`
- `drawnix` 内补了一层 `runtime-helpers`

经验：

- 浏览器兼容性问题如果散落在业务层，后面只会反复回归
- 一旦某类 API 有权限、兼容、运行时差异，就应该尽快收口成 helper

## 二、哪些单子可以关，哪些不要急着关

### 可以关的单子

这轮已经关闭的 issue，特点都很一致：问题路径明确、修复点明确、代码里已经有直接对应的补丁。

- `019b26b0-f85d-7b90-a66d-d8573f0e8350` `crypto.randomUUID is not a function`
- `019d89b4-aac9-7e43-ab56-d893a1d958fb` 剪贴板 `NotAllowedError`
- `019daa1f-c07c-7d63-a070-21652c50f2d5` `Cannot read properties of undefined (reading 'type')`

判断标准：

- 能定位到具体代码入口
- 能解释根因，不是只靠猜
- 修复后有明显的防御或替代路径

### 不要急着关的单子

以下问题目前不应误关：

- `Script error.`
- `Invalid hook call`
- 混有多个 fingerprint 的 `DataError / showOpenFilePicker aborted`
- 旧 fingerprint 的剪贴板异常

原因：

- `Script error.` 证据太弱，可能是跨域脚本、source map 缺失、三方脚本报错，不能因为“最近没看到”就关
- `Invalid hook call` 可能是 React 多实例、缓存混版本、发布链路混资源，不是单点修补就能确认解决
- 某些 issue 已经出现 fingerprint 污染，一个单子里混了不同类型错误，不能拿其中一个修复去关闭整个 issue

经验：

- 关闭 issue 的标准应该比“提交代码了”更严格
- PostHog error tracking 是观测工具，不是待办列表；被错误聚合污染的 issue，要先质疑 fingerprint，再决定是否关闭

## 三、这轮最值钱的经验

### 1. 先修“真实故障”，再降“采集噪音”

正确顺序是：

1. 修真实会影响用户的异常
2. 给可预期取消场景降噪
3. 再回头清理 error tracking 状态

如果一上来先做过滤，很容易把真实问题埋掉。

### 2. 浏览器能力差异，要按“退化可用”设计

像 UUID、剪贴板、文件选择器这些 API，不能默认所有运行环境都支持同一套能力。

推荐原则：

- 优先现代 API
- 失败时走兼容 fallback
- 用户取消时静默退出
- 真异常才继续抛出

### 3. 输入脏值要在边界层截住

空 `id`、缺失 `shot.type`、不完整镜头数据，本质都是边界数据质量问题。

经验：

- 存储层负责 key 防守
- 组件层负责展示容错
- 采集层负责避免把边界脏值放大成监控噪音

### 4. `Invalid hook call` 这类问题通常不是“单文件 bug”

这类问题大概率要从下面几类方向排查：

- React 多实例
- CDN / SW 缓存混版本
- 发布产物和运行时资源不一致

这轮先补了 `vite resolve.dedupe`，但这只能算降低风险，不代表已经完全闭环。

经验：

- 涉及运行时包实例一致性的错误，优先怀疑构建/缓存/发布链路
- 不要把“加了 dedupe”误判成“问题已经彻底解决”

## 四、后续建议

### 1. 继续观察而不是继续扫单

建议先看新版本上线后的 error tracking 趋势：

- `AbortError` 是否还在持续新增
- 空 key `DataError` 是否明显下降
- `Invalid hook call` 是否只出现在旧版本

如果新版本已经不再新增，再关单更稳。

### 2. 给高噪音 issue 建立关闭前检查表

建议关闭前至少确认：

- 最近 24 小时或 72 小时是否仍在新增
- 是否只出现在旧版本
- 是否存在 fingerprint 污染
- 是否能把 issue 和具体代码补丁一一对应

### 3. 把“取消类异常”纳入统一过滤策略

后面新增浏览器能力时，默认检查这三件事：

- 用户取消会不会抛异常
- 权限拒绝是不是预期行为
- 是否会被 crash logger / PostHog 误记为真实故障

## 五、涉及文件

- `packages/utils/src/id/index.ts`
- `packages/utils/src/dom/index.ts`
- `packages/drawnix/src/utils/runtime-helpers.ts`
- `packages/drawnix/src/components/shared/workflow/ShotCard.tsx`
- `packages/drawnix/src/components/video-analyzer/components/ShotTimeline.tsx`
- `packages/drawnix/src/data/json.ts`
- `packages/drawnix/src/utils/image.ts`
- `packages/drawnix/src/services/base-storage-reader.ts`
- `packages/drawnix/src/services/workflow-engine/workflow-storage-writer.ts`
- `packages/drawnix/src/services/kv-storage-service.ts`
- `packages/drawnix/src/services/unified-cache-service.ts`
- `packages/drawnix/src/services/media-executor/task-storage-writer.ts`
- `apps/web/src/crash-logger.ts`
- `apps/web/vite.config.ts`
- `packages/drawnix/vite.config.ts`

## 六、一句话结论

这轮真正沉淀下来的不是“关了几个单”，而是一个更稳的处理顺序：

先修真实故障，再过滤预期噪音，最后再决定关单。✅
