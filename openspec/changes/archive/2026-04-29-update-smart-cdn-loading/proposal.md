# Change: 智能 CDN 优先加载

## Why
当前静态资源策略为同源优先、CDN 仅在异常时兜底。该策略在发版窗口更稳，但会让大量正常流量绕过 CDN，导致已反馈的加载变慢问题。

## What Changes
- 将版本化静态资源切换为 `Cache First -> 智能 CDN 优先 -> 源站快速兜底`
- 保留 `index.html`、`version.json`、`manifest.json`、`sw.js` 等入口链路的同源优先
- 让主线程的 CDN 探测结果同步到 Service Worker，并持久化为轻量偏好记录
- 为静态缓存写入统一元数据，允许复用已校验的 CDN 响应

## Impact
- Affected specs: `smart-cdn-loading`
- Affected code: `apps/web/src/sw/index.ts`, `apps/web/src/sw/cdn-fallback.ts`, `apps/web/src/main.tsx`
