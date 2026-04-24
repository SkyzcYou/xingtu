# Change: 收口发布期静态资源加载

## Why
当前发布链路存在两个稳定性缺口：一是运行时仍会尝试访问会被 CORS 拦截的 CDN 源，二是服务器 HTML 可能早于关键静态资源在 CDN 就绪，导致首屏或懒加载资源在发版窗口失配。

## What Changes
- 收口运行时静态资源主链路为 `Cache First -> jsDelivr -> 源站`
- 将 `unpkg` 移出运行时 fetch 决策链，仅保留为发布产物分发渠道
- 为构建增加稳定 `manualChunks`，固定高频延后模块分组
- 为发布脚本增加“关键 CDN 资产就绪后再部署服务器”的阻塞门禁
- 补强启动边界校验，防止高频延后模块重新回流入口链路

## Impact
- Affected specs: `smart-cdn-loading`, `startup-performance`
- Affected code: `apps/web/src/sw`, `apps/web/public/cdn-config.js`, `apps/web/vite.config.ts`, `scripts/deploy-hybrid.js`, `scripts/validate-startup-bundle.js`
