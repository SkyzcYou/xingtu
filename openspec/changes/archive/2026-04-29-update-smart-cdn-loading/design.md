## Context
发版窗口中存在“服务器已切到新版本、npm CDN 还未完全可用”的短暂不一致窗口。此前的 CDN 绝对优先会触发 404 或错误页，改成源站优先后又牺牲了正常流量下的加载速度。

## Goals
- 对版本化静态资源尽可能优先使用 CDN
- 对入口链路保持同源优先，避免版本错配
- CDN 异常时快速熔断并回源，避免一个页面内重复踩坑
- 允许 Service Worker 复用已校验过的 CDN 缓存响应

## Decisions
- 使用已有 `cdn-config.js` 的测速结果作为偏好输入，但真正的资源选择由 Service Worker 执行
- 偏好数据持久化到独立 Cache Storage，避免引入新的 IndexedDB 表
- 静态缓存统一写入 `x-sw-source`、`x-sw-revision`、`x-sw-app-version`
- 非 HTML 的预缓存与运行时静态请求共享同一套智能加载路径
