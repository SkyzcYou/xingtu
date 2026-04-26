# npm 依赖瘦身经验

更新日期：2026-04-26

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

## 一句话结论

依赖瘦身最稳的路径不是“看到大包就删”，而是先做窄用法替换，再用真实安装树和生产构建验证依赖图。✅
