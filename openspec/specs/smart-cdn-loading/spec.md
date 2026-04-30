# smart-cdn-loading Specification

## Purpose
TBD - created by archiving change update-smart-cdn-loading. Update Purpose after archive.
## Requirements
### Requirement: 智能 CDN 优先静态资源加载
系统 SHALL 对版本化静态资源采用 `Cache First -> 智能 CDN 优先 -> 源站快速兜底` 的加载顺序，同时对入口链路保持同源优先。

#### Scenario: 版本化静态资源优先走 CDN
- **WHEN** Service Worker 处理未命中缓存的脚本、样式、字体、图片、图标或其他版本化静态 JSON 请求
- **THEN** 系统优先尝试健康且匹配当前版本的 CDN
- **AND** CDN 成功返回后将结果写入静态缓存

#### Scenario: 入口链路保持同源优先
- **WHEN** 请求资源为 `index.html`、导航文档、`version.json`、`manifest.json`、`sw.js` 或 `precache-manifest.json`
- **THEN** 系统优先从当前服务器获取资源
- **AND** 不因 CDN 偏好而改写该优先级

#### Scenario: CDN 在发版窗口不可用时快速回源
- **WHEN** CDN 对当前版本静态资源返回超时、404/5xx、错误 HTML 或明显异常内容
- **THEN** 系统快速回退到当前服务器
- **AND** 失败的 CDN 在短时间内被降级，避免同一页面重复优先命中该 CDN

### Requirement: CDN 偏好同步与持久化
系统 SHALL 将主线程探测到的 CDN 偏好同步给 Service Worker，并允许后续刷新在主线程尚未启动前复用该偏好。

#### Scenario: 主线程同步 CDN 偏好
- **WHEN** 主线程已得到 CDN 探测结果
- **THEN** 主线程发送 `SW_CDN_SET_PREFERENCE`
- **AND** 消息体包含 `cdn`、`latency`、`timestamp`、`version`

#### Scenario: Service Worker 复用持久化偏好
- **WHEN** 用户刷新页面且主线程尚未重新完成 CDN 探测
- **THEN** Service Worker 可读取上次持久化的偏好
- **AND** 仅在偏好版本与当前应用版本一致时作为排序依据

### Requirement: 已校验 CDN 缓存可复用
系统 SHALL 允许复用已校验的 CDN 静态缓存响应，而不是将所有非源站缓存一律视为异常。

#### Scenario: 合法 CDN 缓存直接命中
- **WHEN** 静态缓存项包含有效的 `x-sw-source`、`x-sw-revision`、`x-sw-app-version`
- **AND** `x-sw-app-version` 与当前应用版本一致
- **THEN** Service Worker 直接返回该缓存项

#### Scenario: 异常缓存项被清理
- **WHEN** 缓存项缺少必需元数据、版本不匹配，或静态资源缓存实际返回 HTML 错页
- **THEN** Service Worker 删除该缓存项
- **AND** 重新按智能加载策略获取资源

