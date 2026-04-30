## 1. Runtime CDN
- [x] 1.1 收口 Service Worker CDN 源，只保留运行时可用源参与静态资源拉取
- [x] 1.2 更新主线程 CDN 探测脚本，避免继续输出不可用运行时源
- [x] 1.3 更新相关单测，覆盖新的候选源与回源顺序

## 2. Startup Boundary
- [x] 2.1 为 web 构建增加稳定 `manualChunks`
- [x] 2.2 让 idle prefetch manifest 基于稳定 chunk 分组工作
- [x] 2.3 扩展启动边界校验，守护入口依赖链

## 3. Release Gate
- [x] 3.1 在发布脚本中加入关键 CDN 资产就绪轮询
- [x] 3.2 仅在 CDN 关键资产 ready 后继续部署服务器 HTML
- [x] 3.3 更新发布摘要，反映新的运行时加载顺序
