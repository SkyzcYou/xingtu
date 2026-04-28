# npm 依赖瘦身经验

更新日期：2026-04-28

## 背景

本轮目标是减少安装体积、构建解析压力和异步 chunk 体积，同时不降低现有体验。实践证明，依赖瘦身不能只看包大小或 direct import，要结合源码、锁文件、真实安装树和生产构建一起判断。

## 本轮结论

### 1. 高收益低风险项优先做

已安全替换或移除：

- `ahooks`：只用到 `useEventListener`，改成本地轻量 hook。
- `mobile-detect`：只用于移动端判断，改为 `matchMedia`、pointer、touch 能力检测。
- `@llamaindex/chat-ui`：主要使用聊天展示组件和类型，改成本地轻量类型与消息区组件。
- `@sentry/react`：异常监控已由 PostHog 承担，删除 Sentry 初始化与依赖。
- `prismjs`：不再作为直接依赖保留。
- `tdesign-icons-react`：统一到 `0.6.x`，避免 `0.5.x` 和 `0.6.x` 双版本。

效果最明显的是聊天区：`ChatMessagesArea` 从原先约 405KB gzip 降到约 5KB gzip。

### 2. direct dependency 不等于一定能删

`@plait/layouts` 是这轮的反例。

源码里没有直接 import 它，但 `@plait/mind` 的构建产物会 import `@plait/layouts`。只做 `pnpm install --lockfile-only` 时旧的 `node_modules` 还在，构建会假通过；真正 prune 安装树后，`vite build` 会报：

```text
Rollup failed to resolve import "@plait/layouts" from "@plait/mind"
```

经验：

- “项目源码没用”不等于“运行时依赖图没用”。
- 如果上游包把必要依赖漏写到自己的 `dependencies`，应用层仍要显式保留。
- 删除依赖后必须跑一次真实 `pnpm install --frozen-lockfile`，不能只更新锁文件。

### 3. 大包不一定适合直接替换

暂不硬替的包：

- `mermaid`：功能承载重，且存在转换器带来的版本/分块问题；优先治理加载和去重。
- `xlsx`：已经动态导入，保留 Excel 体验时不应强行降级成 CSV。
- `tdesign-react`：使用面广，直接替换成本高；应先考虑按需导入或 UI 适配层。
- `jszip`、`viewerjs`、`rxjs`、`localforage`：收益和风险不匹配，不作为第一批目标。

经验：

- 大包优先看“是否在首屏”“是否动态导入”“是否承载核心体验”。
- 低频功能的大包，先保证懒加载；高频窄用法的小依赖，优先本地替代。

### 4. 图标库替换属于视觉能力变更，不应混入无损瘦身

2026-04-28 的二次瘦身中，曾尝试把 `tdesign-icons-react` 通过本地兼容层映射到 `lucide-react`。虽然可以补齐 TDesign 内部导出的图标名并通过类型检查、dev server 预构建，但实际 UI 出现了明显视觉回归：

- 图标形态与原 TDesign 图标不一致，例如画布管理、搜索、文件夹、图层等入口。
- `filled`、描边粗细、对齐、尺寸和设计语言很难靠简单 alias 等价。
- TDesign 组件内部也会 import 大量图标名，补齐导出只能解决构建错误，不能保证视觉一致。

最终结论：

- 保留 `tdesign-icons-react@0.6.x`，只做版本去重，不做跨图标库替换。
- 如需替换为 `lucide-react`，必须单独立项，逐个组件改 import，并做截图/交互回归。
- “能编译”和“视觉无损”是两件事；依赖瘦身主线优先避免视觉语义变化。

### 5. 只读 Markdown 可轻量化，编辑器路径必须保留

只读聊天消息、工作流消息和卡片展示不需要加载完整 Milkdown 编辑器。更稳的做法是新增轻量 `MarkdownReadonly`：

- 只覆盖只读展示路径。
- 知识库编辑器继续使用 Milkdown，保留编辑体验。
- 链接和图片 URL 做 scheme 过滤，避免因为轻量实现引入注入风险。
- Mermaid 仍通过代码块回调延迟加载渲染器，不进入普通只读 Markdown 核心路径。

经验：

- 编辑器依赖不要“一刀切”替换；先拆读写路径。
- 轻量 Markdown 组件必须避免 `dangerouslySetInnerHTML`，并对链接、图片、素材引用做安全边界。

### 6. size-limit 守护 chunk 时不要默认跑 JS 执行耗时

`@size-limit/preset-app` 默认包含 `@size-limit/time`，会启动 headless Chrome 测量 JS 运行耗时。用于检查构建后 chunk gzip 预算时，这一步可能卡住或对非入口 chunk 产生噪音。

更稳的配置：

- `.size-limit.json` 指向真实 chunk 命名，例如 `startup-app-*`、`ai-chat-*`、`diagram-engines-*`。
- 每项设置 `"gzip": true` 和 `"running": false`。
- `pnpm size` 只作为产物预算守护，不承担浏览器执行性能测试。

### 7. 本地 dev 的 SW 与 CSP 要和生产策略分开

本轮还暴露了本地 dev 特有问题：旧 Service Worker 可能拦截 Vite 的 `/@fs/...` 依赖资源，造成 503；同时 dev CSP 如果只允许 `https:`/`wss:`，会阻止 Vite HMR 的 `ws://localhost:*`。

处理原则：

- 本地 `localhost`/`127.0.0.1` 默认禁用并清理旧 Service Worker，`?sw=1` 才显式启用。
- dev server CSP 放行 `http:` 和 `ws:`，生产/preview 保持更严格策略。
- 修这类问题后用 `curl -I /`、`curl -I /src/main.tsx`、`curl -I /@fs/...` 做轻量验证，不必反复生产构建。

## 验证清单

### 1. 残留搜索

删除依赖后要同时查源码、package、锁文件：

```bash
rg -n "@llamaindex/chat-ui|mobile-detect|from 'ahooks'|@sentry/react|prismjs|tdesign-icons-react@0\\.5" package.json packages/*/package.json apps packages pnpm-lock.yaml -g '!**/node_modules/**' -g '!**/dist/**'
```

### 2. 真实安装树验证

锁文件更新后必须同步本地安装树：

```bash
NPM_TOKEN=${NPM_TOKEN:-dummy} pnpm install --frozen-lockfile
```

然后用 `pnpm list` 看是否仍有旧包：

```bash
NPM_TOKEN=${NPM_TOKEN:-dummy} pnpm list @sentry/react @llamaindex/chat-ui ahooks mobile-detect tdesign-icons-react --depth 10 --json
```

### 3. 类型和构建

基础验证：

```bash
NPM_TOKEN=${NPM_TOKEN:-dummy} pnpm typecheck
```

关键批次后跑生产构建：

```bash
NPM_TOKEN=${NPM_TOKEN:-dummy} pnpm exec nx build web
```

经验：

- `typecheck` 能验证 API 和类型迁移。
- `build web` 能暴露真实依赖图、动态导入、CSS、SW 构建问题。
- `pnpm build:web` 会更新 `version.json`，只做 bundle 验证时优先用 `pnpm exec nx build web`。
- dev 资源 503 或 HMR CSP 问题优先检查本地 SW 和 dev CSP，不要直接怀疑依赖安装树。

## Web Vitals 去向

`web-vitals` 没有单独上报到第三方性能平台，而是动态导入后发到 PostHog：

- 服务：`packages/drawnix/src/services/web-vitals-service.ts`
- 事件名：`$web_vitals`
- 指标：`CLS`、`FCP`、`LCP`、`TTFB`、`INP`
- 上报入口：`analytics.track('$web_vitals', eventProperties)`

因此删除 Sentry 后，异常监控和 Web Vitals 仍统一留在 PostHog 体系内。

## 实施建议

1. 先替换窄用法依赖，再动大组件库。
2. 本地替代要保持行为等价，尤其注意事件监听清理、SSR/window 判断、移动端能力检测。
3. 聊天 UI 替换要回归普通消息、图片消息、工作流消息、错误消息和 Mermaid markdown。
4. 锁文件验证后必须 prune 安装树，否则容易被旧 `node_modules` 误导。
5. 大包治理优先做懒加载、去重、manual chunk 分析，避免用低体验替代换体积。
6. 图标库、UI 组件库替换要单独走视觉回归，不放进“无损瘦身”批次。
7. size-limit 检查 chunk gzip 预算时关闭 `running`，避免 headless Chrome 执行测量卡住。

## 一句话结论

依赖瘦身最稳的路径不是“看到大包就删”，而是先做窄用法替换，再用真实安装树和生产构建验证依赖图。✅
