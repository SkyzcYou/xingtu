# 循环依赖治理经验

更新日期：2026-04-27

## 背景

本轮目标是继续收敛项目里的循环依赖：先把运行时静态 import、type-only import 清到 0，再单独收敛 dynamic import 形成的懒加载 SCC。最终 `runtime-static`、`static-all`、`dynamic-inclusive` 三层扫描均为 0。

## 本轮结论

### 1. 循环依赖要分层看

推荐至少区分三层：

- `runtime-static`：运行时静态 import/export，必须作为失败项。
- `static-all`：运行时静态 + type-only import/export，适合作为架构洁净度检查。
- `dynamic`：动态 import 造成的懒加载图回边，适合单独专题治理。

经验：不要只看“有没有环”，要先判断它会不会影响初始化顺序、chunk 分包、首屏边界或类型层耦合。

### 2. type-only 环也值得收敛

TypeScript 的 type-only import 不会直接进入运行时代码，但它会暴露模块职责不清的问题。本轮剩余问题主要来自：

- workflow converter 同时承载类型和转换逻辑。
- settings manager 同时承载配置类型、常量和运行时管理器。
- model adapter barrel 带有默认注册副作用，被类型引用误触。

经验：类型环通常不需要大改逻辑，优先抽出中立纯类型模块，让业务模块都向下依赖。

### 3. 桶文件不是类型边界

`index.ts` barrel 很方便，但如果 barrel 同时 re-export 有副作用的运行时模块，就不适合作为纯类型 import 来源。

推荐做法：

- 类型引用直连 `types` 或低层纯类型模块。
- 有副作用的 barrel 只给运行时功能入口用。
- 公共 API 需要兼容时，在旧入口 re-export 类型，但内部新代码不要再从旧入口回引。

本轮例子：

- `audio-api-service` 的结果类型改为直连 `model-adapters/types`。
- `gemini-api/types` 改为直连 `provider-routing/types`。
- `settings-manager` 继续 re-export `settings-types`，但 provider-routing 内部不再回引它。

### 4. 中立类型模块要保持“轻”

抽出的类型模块只应依赖更底层的纯类型或常量类型，不应引入服务、单例、注册表、存储读写或 UI 组件。

本轮新增的边界：

- `workflow-types`：只承载 workflow 数据形状。
- `settings-types`：只承载 settings 数据形状和纯常量。

经验：中立模块一旦混入运行时逻辑，很快会变成新的公共泥球。

### 5. 检查脚本默认要保守

`pnpm check:cycles` 继续只检查运行时静态环，避免突然扩大 CI 失败面。新增 `pnpm check:cycles:types` 专门检查 type-only 环，适合在架构收敛或重构后复跑。

经验：检查项升级要分阶段，让默认门禁稳定，再逐步把更严格模式纳入常规流程。

### 6. dynamic import 环要先找“元数据拉注册表”

本轮 dynamic-inclusive 大 SCC 最初有 97 个文件，第一刀不是改组件，而是切断内置工具元数据对工具注册表的依赖：

- `built-in-tools` 只读取 manifests，不读取 `toolRegistry`。
- `ToolPluginModule` 移到纯类型文件，工具插件不再 type-import registry。
- 模型测试启动器只读内置 manifests，不为查一个 tool manifest 拉入组件注册表。

结果：97 文件大 SCC 立即拆成 `22 + 5 + 5`。经验是：如果“常量/元数据”反向 import 了“注册表/组件加载器”，懒加载图很容易被拖成大团。

### 7. 通用 UI 组件不要默认回拉业务能力

剩余 22 文件 SCC 的关键边是 `MediaViewport -> canvas-operations -> card -> MarkdownEditor -> media-library -> shared`。处理方式：

- 媒体预览组件只依赖轻量 image/video 插入 helper，不直接 import 全量 `canvas-operations`。
- `canvas-board-ref` 独立承载 board 引用，避免轻量插入能力为了拿 board 反向拉入文本/Card 插入链。
- media-library 内部使用 leaf import，不从 `shared/index` 桶文件拿 `HoverTip`、`ContextMenu`。

经验：通用展示组件可以提供兜底能力，但兜底能力必须是窄入口；否则一个“插入到画布”按钮就会把 Card、Markdown、素材库一起拉回预览组件。

### 8. 运行时单例互访用 bridge，Transform 和组件分离

两个 5 文件小 SCC 分别来自 service 互访和插件组件互访：

- GitHub sync 需要刷新 workspace，但不再静态 import `workspace-service`；改为 `workspace-runtime-bridge` 注册运行时能力。
- `sw-capabilities` 只需要 WorkZone transforms，不需要 WorkZone React 组件；将 transforms 拆到中立模块，`with-workzone` 保持 re-export 兼容。

经验：服务单例之间需要互相调用时，优先抽一个无副作用 bridge；插件的纯 transform/API 不要和 React 渲染组件放在同一个依赖入口。

## 防回归规则

新增或调整 import 前，先按下面规则判断方向是否正确：

| 场景 | 推荐方向 | 避免方向 |
| --- | --- | --- |
| 类型共享 | 业务模块 -> `types` / 纯类型模块 | `types` -> service / UI / registry |
| 元数据读取 | 常量模块 -> manifests / 纯数据 | constants -> registry / 组件加载器 |
| 通用 UI 兜底能力 | UI -> 窄 helper | UI -> 全量业务服务 barrel |
| 插件能力复用 | service -> transform-only 模块 | service -> plugin React 入口 |
| 服务单例互访 | service -> runtime bridge | service A -> service B -> service A |
| 组件间复用 | 叶子组件直连叶子组件 | 叶子组件 -> `shared/index` 大桶 |

提交前重点检查三类高风险信号：

1. 一个 `index.ts` 同时 re-export 类型、服务单例、组件和注册副作用。
2. 一个通用组件为了小功能 import 了完整业务 service。
3. 一个“纯数据/纯类型”文件 import 了 React、registry、storage 或网络请求模块。

如果确实需要跨层调用，先抽窄接口：`*-types`、`*-transforms`、`*-bridge`、`*-ref`、`*-helper`。这些模块必须保持无 UI、无存储副作用、无注册副作用。

## 验证清单

基础检查：

```bash
NPM_TOKEN=${NPM_TOKEN:-dummy} pnpm check:cycles
NPM_TOKEN=${NPM_TOKEN:-dummy} pnpm check:cycles:types
NPM_TOKEN=${NPM_TOKEN:-dummy} pnpm typecheck
```

如果改动触及 Vite manual chunk、入口预取或重包懒加载，再跑：

```bash
NPM_TOKEN=${NPM_TOKEN:-dummy} pnpm exec nx build web
NPM_TOKEN=${NPM_TOKEN:-dummy} pnpm verify:startup
```

## 后续建议

1. 新增核心类型时，优先放到纯类型模块，不要顺手放进服务实现文件。
2. 从 barrel import 前先确认该 barrel 是否包含运行时副作用。
3. `dynamic import` SCC 不要和静态环一起治理，应按工具窗口、SW、媒体插入等边界拆专题；治理时优先切“元数据 -> 注册表”“通用 UI -> 业务服务”“服务单例互访”三类边。
4. 保持旧导出兼容，但内部依赖逐步迁到低层入口。
5. 每次拆环都先跑 `check:cycles:types`，再跑 `typecheck`，避免只修图不修类型。

## 一句话结论

循环依赖治理最稳的方式是先分清运行时、类型层和动态懒加载，再用纯类型模块、窄 helper、runtime bridge 打断高风险边界。✅
