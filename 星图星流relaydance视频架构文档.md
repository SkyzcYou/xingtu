# 星图 / 星流 / RelayDance 视频生成架构文档

本文档总结当前视频生成链路中 **星图（前端）→ 星流（new-api 中转）→ RelayDance/RealyDance（上游）→ Seedance/ByteDance** 的职责边界、请求格式、参数映射与常见问题定位方式。

> 本文档不记录任何 API Key、Token 或其他敏感凭据。

## 1. 总体架构

```text
+-----------------------------+
| 星图 Web 前端                |
| aitu/packages/drawnix        |
|                             |
| - 模型选择                   |
| - 参数 UI                    |
| - 任务队列 / SW              |
| - 视频任务提交与轮询          |
+--------------+--------------+
               |
               | OpenAI-compatible /videos
               | JSON 或 multipart/form-data
               v
+-----------------------------+
| 星流 new-api                 |
| /home/skyzcyou/Repos/GoProjects/new-api |
|                             |
| - 模型路由                   |
| - 模型名映射                 |
| - 计费与任务状态存储          |
| - Sora/Doubao 等 TaskAdaptor |
+--------------+--------------+
               |
               | 上游 API 请求
               v
+-----------------------------+
| RelayDance / RealyDance 上游 |
| app.relaydance.com / relaydance.com |
|                             |
| - Gradio 队列或直接 API       |
| - 生成任务提交               |
| - 任务进度查询               |
+--------------+--------------+
               |
               | Seedance 任务
               v
+-----------------------------+
| ByteDance / Seedance         |
| 视频生成底层服务              |
+--------------+--------------+
               |
               | TOS 签名视频 URL
               v
+-----------------------------+
| 星流返回任务结果              |
| 星图缓存并展示视频            |
+-----------------------------+
```

## 2. 各层职责

### 2.1 星图（前端）

代码位置：`/home/skyzcyou/Repos/FrontProjects/aitu`

主要职责：

- 展示视频模型列表与参数表单。
- 根据当前 provider / model binding 推断视频 API 兼容模式。
- 创建视频任务，并通过 Service Worker 队列或主线程降级路径执行。
- 调用星流 `/videos` 提交任务。
- 轮询 `/videos/{taskId}` 获取状态。
- 任务完成后缓存远程视频 URL，并插入画布 / 媒体库。

关键文件：

| 文件 | 作用 |
|------|------|
| `packages/drawnix/src/services/video-api-service.ts` | 主线程视频提交与轮询 |
| `packages/drawnix/src/services/media-api/video-api.ts` | SW/共享视频 API 提交逻辑 |
| `packages/drawnix/src/services/video-binding-utils.ts` | 视频 binding、duration、size、metadata 映射 |
| `packages/drawnix/src/services/model-adapters/default-adapters.ts` | 默认视频 adapter 接入 `videoAPIService` |
| `packages/drawnix/src/mcp/tools/video-generation.ts` | MCP/队列视频生成工具 |
| `packages/drawnix/src/constants/model-config.ts` | 参数定义，如 Seedance duration/size/aspect_ratio |

### 2.2 星流（new-api）

代码位置：`/home/skyzcyou/Repos/GoProjects/new-api`

主要职责：

- 提供 OpenAI-compatible 视频接口。
- 接收星图的视频任务请求。
- 根据 channel / model mapping 路由到对应 TaskAdaptor。
- 将统一请求转换为上游 API 请求。
- 存储任务与上游 task id 的映射。
- 查询上游任务状态并转换为统一任务状态。

关键文件：

| 文件 | 作用 |
|------|------|
| `relay/common/relay_utils.go` | 通用视频任务请求解析、校验、存储 |
| `relay/channel/task/sora/adaptor.go` | Sora/OpenAI-like 视频任务透传适配器 |
| `relay/channel/task/doubao/adaptor.go` | Doubao/Seedance 视频任务适配器 |
| `relay/channel/task/doubao/constants.go` | Doubao/Seedance 模型列表与计费参数 |

### 2.3 RelayDance / RealyDance 上游

调试项目位置：`/home/skyzcyou/Repos/FrontProjects/relaydance-ana`

主要职责：

- 接收星流转发的任务。
- 将任务提交到底层 Seedance/ByteDance。
- 轮询生成进度。
- 最终返回视频文件对象或 TOS 签名 URL。

调试项目中的关键文件：

| 文件 | 作用 |
|------|------|
| `relaydance_mvp.py` | 直接调用 Gradio 队列接口的最小验证脚本 |
| `my-dance-app/relaydance_client.py` | 直接 API 模式客户端 |
| `my-dance-app/schemas.py` | RelayDance 模型、比例、分辨率、计价辅助逻辑 |
| `接口关系图.md` | 已验证接口与调用流程说明 |

## 3. 两条上游调用模式

当前资料里存在两类 RelayDance 调用方式：

### 3.1 Gradio 队列模式【仅仅做参考】

调试脚本：`relaydance_mvp.py`

直接调用：

```text
POST https://app.relaydance.com/gradio_api/queue/join?
GET  https://app.relaydance.com/gradio_api/queue/data?session_hash=...
```

请求核心结构：

```json
{
  "fn_index": 22,
  "trigger_id": 54,
  "session_hash": "py_xxx",
  "data": [
    "API_KEY",
    "prompt",
    "Seedance 2.0 Fast (速度优先, 最高 720p)",
    "480p",
    "16:9",
    5,
    null,
    "",
    null,
    "",
    null,
    "",
    null,
    "",
    null,
    "",
    0,
    false,
    false,
    false,
    false,
    false,
    true,
    0,
    "default",
    ""
  ]
}
```

特点：

- 参数通过 Gradio `data` 数组按位置传递。
- 已验证比例选项为：`16:9`、`9:16`、`1:1`、`4:3`、`3:4`、`21:9`。
- 最终视频 URL 可能出现在 Gradio 输出或日志里的 TOS 签名地址。

### 3.2 直接 API / 星流中转模式 【星流采用】

调试项目：`my-dance-app/relaydance_client.py`

星流对星图暴露的接口一般为：

```text
POST /v1/videos 或 /videos
GET  /v1/videos/{taskId} 或 /videos/{taskId}
```

无参考图时，星图 / 调试客户端提交 JSON：

```json
{
  "model": "doubao-seedance-2-0-fast-260128",
  "prompt": "...",
  "seconds": "5",
  "metadata": {
    "resolution": "480p",
    "ratio": "16:9",
    "generate_audio": false,
    "watermark": false
  }
}
```

有参考图时，提交 multipart：

```text
model=doubao-seedance-2-0-fast-260128
prompt=...
seconds=5
metadata={"resolution":"480p","ratio":"16:9",...}
image=@reference.png
```

特点：

- `metadata.ratio` 会继续映射到上游视频生成参数 `ratio`。
- `metadata.resolution` 会继续映射到上游视频生成参数 `resolution`。
- 如果星图传入上游不支持的 ratio，错误会从 RelayDance/Seedance 返回，经星流包装后透传给星图。

## 4. 星图到星流的视频参数映射

星图中的星流视频兼容模式由 provider binding 决定：

```text
provider profile.videoApiCompatibility = xingliu-video
        |
        v
binding.metadata.video.resolvedVideoApiCompatibility = xingliu-video
        |
        v
isXingliuVideoBinding(...) = true
```

当 `isXingliuVideoBinding` 为 true 时，星图不会使用普通 `size` 表单模式，而会构造星流兼容 metadata：

```ts
buildXingliuVideoMetadata(size, params, modelId)
```

输出结构：

```ts
interface XingliuVideoMetadata {
  resolution: string;
  ratio: string;
  generate_audio: boolean;
  watermark: boolean;
}
```

映射规则：

| 星图输入 | 星流 metadata | 说明 |
|----------|---------------|------|
| `size = "480p"` | `resolution = "480p"` | 最低成本默认分辨率 |
| `size = "720p@9:16"` | `resolution = "720p"`, `ratio = "9:16"` | 分辨率 + 比例组合 |
| `size = "1280x720"` | `ratio = "16:9"`, `resolution` 默认 `480p` | 像素尺寸只用于推断比例 |
| `params.aspect_ratio = "9:16"` | `ratio = "9:16"` | 显式比例优先 |
| `params.generate_audio = "true"` | `generate_audio = true` | 是否生成音频 |
| `params.watermark = "true"` | `watermark = true` | 是否加水印 |

### 4.1 具体模型的参数定制

参考站只展示 Seedance 大类模型，但星图会列出星流 `/models` 返回的每个具体视频模型。因此星图的“设置生成参数”需要按具体 `model id` 定制，而不是所有 Seedance 共用同一套分辨率。

当前策略是按模型能力上限显示分辨率，不把 `720p` / `1080p` 模型锁死到单一值：

| 具体模型示例 | 分辨率选项 | 默认值 |
|--------------|------------|--------|
| `doubao-seedance-2-0-fast-260128` | `480p`, `720p` | `480p` |
| `doubao-seedance-2-0-720p` | `480p`, `720p` | `480p` |
| `doubao-seedance-2-0-1080p` | `480p`, `720p`, `1080p` | `480p` |
| `seedance-1-5-pro-with-audio` / `seedance-1-5-pro-no-audio` | `480p`, `720p` | `480p` |
| `seedance-nsfw` | `480p` | `480p` |
| `seedance-nsfw-720p` / `seedance-fast-nsfw` | `480p`, `720p` | `480p` |
| `seedance-nsfw-1080p` | `480p`, `720p`, `1080p` | `480p` |

比例参数仍是独立字段，只展示 RelayDance 已验证的 6 个值：`16:9`、`9:16`、`1:1`、`4:3`、`3:4`、`21:9`。

## 5. 星流到 RelayDance / Seedance 的参数映射

### 5.1 Doubao/Seedance TaskAdaptor

文件：`new-api/relay/channel/task/doubao/adaptor.go`

星流内部统一请求结构中的字段会被转换为 Doubao/Seedance 请求结构：

```go
type requestPayload struct {
    Model         string         `json:"model"`
    Content       []ContentItem  `json:"content,omitempty"`
    Resolution    string         `json:"resolution,omitempty"`
    Ratio         string         `json:"ratio,omitempty"`
    Duration      *dto.IntValue  `json:"duration,omitempty"`
    GenerateAudio *dto.BoolValue `json:"generate_audio,omitempty"`
    Watermark     *dto.BoolValue `json:"watermark,omitempty"`
}
```

关键逻辑：

- `req.Metadata` 会通过 `taskcommon.UnmarshalMetadata(metadata, &r)` 展开到上游 request payload。
- `metadata.ratio` 会进入上游请求的 `ratio` 字段。
- `metadata.resolution` 会进入上游请求的 `resolution` 字段。
- `req.Seconds` 会转换为上游 `duration`。
- prompt 会作为 `ContentItem{Type: "text"}` 加到 `content` 数组末尾。

### 5.2 Sora TaskAdaptor

文件：`new-api/relay/channel/task/sora/adaptor.go`

该适配器更偏透传：

- JSON 请求：解析 body 后只替换 `model = info.UpstreamModelName`。
- multipart 请求：重建 multipart，替换 `model` 字段，其余字段透传。
- 不主动理解或修正 `metadata.ratio`。

因此，如果星图请求最终路由到了 Sora adaptor，ratio 问题通常不是该 adaptor 自己生成的，而是请求体中已经带了上游不接受的字段或模型映射后的上游不接受该字段组合。

## 6. 模型名与路径差异

当前链路里可能出现以下模型名：

| 层级 | 示例模型名 | 说明 |
|------|------------|------|
| 星图 UI / discovered model | `doubao-seedance-2-0-fast-260128` | 星图展示或选择的模型 |
| 星流 origin model | `doubao-seedance-2-0-fast-260128` | 星流接收的模型名 |
| 星流 upstream model | `dreamina-seedance-2-0-fast` 等 | 星流 channel 映射到 RelayDance/上游的模型名 |
| RelayDance Gradio label | `Seedance 2.0 Fast (...)` | Gradio UI 使用的模型显示名 |

排查时必须区分：

- 星图提交给星流的 `model`。
- 星流是否启用了 model mapping。
- 星流实际传给上游的 `info.UpstreamModelName`。
- 上游错误消息里出现的模型名。

示例错误：

```text
the parameter ratio specified in the request is not valid for model dreamina-seedance-2-0-fast
```

这说明错误来自星流之后的上游校验，且上游看到的模型已经是 `dreamina-seedance-2-0-fast`。

## 7. 视频状态流转

统一状态大致如下：

```text
星图提交任务
  |
  v
星流创建 public task id
  |
  v
上游返回 upstream task id
  |
  v
星流存储 public task id <-> upstream task id
  |
  v
星图轮询 public task id
  |
  v
星流拉取 upstream task status
  |
  v
queued / submitted / pending
  |
  v
processing / in_progress / unknown
  |
  v
completed / succeeded / success
  |
  v
星图获取 metadata.url / video_url / content URL
  |
  v
星图缓存视频并展示
```

状态映射注意点：

- RelayDance/上游可能返回 `submitted`、`unknown`、`succeeded` 等状态。
- 星流需要把这些状态映射到内部任务状态，否则星图可能看到任务卡住或失败。
- 状态映射只影响轮询结果解释，不会改变提交请求参数。

## 8. `ratio` 相关问题定位

### 8.1 已知支持的比例

从 RelayDance 调试脚本和 UI schema 看，已验证比例为：

```text
16:9
9:16
1:1
4:3
3:4
21:9
```

`adaptive`、`keep_ratio` 等值可能适用于其他供应商或旧模型，但不一定被 RelayDance 当前 Seedance 模型接受。

### 8.2 常见错误

```text
视频生成提交失败: 400 - ... InvalidParameter ... the parameter ratio specified in the request is not valid for model dreamina-seedance-2-0-fast
```

含义：

- 星流已经把请求发到上游。
- 上游模型是 `dreamina-seedance-2-0-fast`。
- 上游拒绝了请求中的 `ratio` 参数。
- 错误点不是“星图无法访问星流”，也不是“任务轮询失败”，而是“提交参数被上游拒绝”。

### 8.3 优先排查顺序

1. 看星图实际提交给星流的 request body。
2. 确认是 JSON 还是 multipart。
3. 找到 `metadata.ratio` 或 `aspect_ratio` 的实际值。
4. 确认星流路由到 Sora adaptor 还是 Doubao adaptor。
5. 确认星流 model mapping 后的上游模型名。
6. 对照 RelayDance 已验证 ratio 列表。

### 8.4 为什么“以前单视频正常，现在不正常”可能发生

可能原因包括：

1. 以前走的是普通 multipart/form-data 路径，只传 `size`，没有传 `metadata.ratio`。
2. 以前的默认 `size=1280x720` 被星流/上游当作普通尺寸处理，没有显式 ratio。
3. 后来星图启用了 `xingliu-video` 兼容模式，开始构造 `metadata.ratio`。
4. 参数偏好持久化里保存过 `adaptive` / `keep_ratio`，单任务也会带上旧值。
5. 后台 model mapping 从 Doubao 官方路径切换到了 RelayDance/dreamina 路径，上游校验规则变严。
6. 星流之前没有把某些字段传到上游，现在直接透传或展开 metadata 后，上游开始校验这些字段。

因此，单任务失败不等于“多任务队列坏了”；它可能只是单任务也开始走了新的参数映射路径。

## 9. 单任务与多任务的区别

| 场景 | 可能路径 | 关键差异 |
|------|----------|----------|
| 星图 UI 单任务 | UI → task queue / SW → video API | 会读取当前模型参数和本地参数偏好 |
| MCP 创建单任务 | MCP tool → createQueueTask | 可能有独立 size/duration 默认归一化逻辑 |
| 多任务批量生成 | 多个 task payload 入队 | 每个任务复用同一模型参数快照 |
| 降级模式 `sw=0` | 主线程直接调用 API | 必须和 SW 路径保持同样的 params/referenceImages 行为 |

排查时要比较最终提交给星流的 HTTP body，而不是只看 UI 表单。

## 10. 推荐的边界修复原则

### 星图侧应该做的事

- 只展示当前 provider/model 实际支持的参数选项。
- 在构造星流 metadata 前，将 `aspect_ratio` 收口到 RelayDance 支持的值。
- 不把其他供应商的参数值直接透传给星流兼容模式。
- 对 `size` / `resolution` / `ratio` 做显式 mapper，而不是跨层直接透传。

### 星流侧应该做的事

- 保持请求转换清晰可追踪。
- 在必要时对明显非法的参数返回更明确的错误。
- 如果要兜底，应记录“收到非法 ratio，已回退”的调试信息，但不要静默吞掉所有上游参数错误。
- 状态映射可以放宽，例如支持 `submitted`、`unknown`、`succeeded`，但这不应和提交参数修复混在一起。

### RelayDance 调试项目应该做的事

- 继续作为上游能力验证来源。
- 记录已验证模型、resolution、ratio、duration 组合。
- 不保存明文 API Key。

## 11. 当前建议

短期建议：

1. 在星图侧限制星流 Seedance 的 `aspect_ratio` 选项为：`16:9/9:16/1:1/4:3/3:4/21:9`。
2. 对历史参数偏好中的非法比例值做提交前兜底，默认回退 `16:9`。
3. 保留星流状态映射修复，因为它解决的是 `submitted/unknown/succeeded` 这类轮询状态兼容问题。
4. 不优先在星流里修改提交参数，除非确认需要后端统一兜底所有客户端。

中期建议：

1. 在星图任务日志中记录最终提交给星流的脱敏参数快照。
2. 在星流任务日志中记录 model mapping 后的上游模型名和脱敏 metadata。
3. 为 RelayDance Seedance 建一组固定兼容性测试：
   - `480p + 16:9 + 5s`
   - `480p + 9:16 + 5s`
   - `720p + 16:9 + 5s`
   - 非法 ratio 应返回可读错误或被明确兜底。

## 12. 快速排查清单

当视频提交失败时，按以下顺序看：

```text
[星图]
1. 当前 provider 是否是星流？
2. 当前模型 id 是什么？
3. 当前 videoApiCompatibility 是否为 xingliu-video？
4. 最终 HTTP body 里的 metadata 是什么？

[星流]
5. 请求路由到了哪个 TaskAdaptor？sora 还是 doubao？
6. OriginModelName 和 UpstreamModelName 分别是什么？
7. 转发给上游的 body 是什么？

[RelayDance]
8. 上游错误里的 model 是什么？
9. 上游错误里的 param 是什么？
10. 该 param 的值是否在已验证范围内？
```

## 13. 关键结论

- 星图是参数来源与 UI/队列发起方。
- 星流是模型路由、任务存储、状态转换与上游适配层。
- RelayDance/RealyDance 是当前 Seedance 视频能力的上游执行方。
- `ratio` 报错通常说明请求已经到达上游，并被上游参数校验拒绝。
- 之前单视频正常但现在失败，最可能是“请求路径或参数映射变了”，而不是单任务机制本身失效。
- 最可靠的判断依据是最终 HTTP request body，而不是 UI 显示值或中间任务 payload。
