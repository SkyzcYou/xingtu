## ADDED Requirements

### Requirement: 运行时只使用可用的 CDN 源
系统 SHALL 仅让可在浏览器与 Service Worker 中稳定访问的 CDN 源参与运行时静态资源加载。

#### Scenario: 不可用 CDN 不进入运行时候选集
- **WHEN** Service Worker 选择当前版本静态资源的远程源
- **THEN** 仅返回运行时可用的 CDN 源
- **AND** 不会尝试已知会被浏览器或 Worker 拦截的 CDN 源

### Requirement: 服务器部署必须等待关键 CDN 资产就绪
系统 SHALL 在部署服务器 HTML 前，确认当前版本关键静态资源已能从运行时 CDN 访问。

#### Scenario: CDN 未就绪时阻塞服务器部署
- **WHEN** npm 发布已完成，但关键 JS/CSS 资产仍未能从运行时 CDN 成功获取
- **THEN** 发布流程持续等待
- **AND** 不继续部署服务器 HTML

#### Scenario: CDN 就绪后继续部署
- **WHEN** 当前版本关键入口静态资源均已从运行时 CDN 返回成功
- **THEN** 发布流程继续执行服务器部署

### Requirement: 启动边界依赖链必须稳定
系统 SHALL 为高频延后模块产出稳定 chunk 分组，并阻止它们重新回流到入口依赖链。

#### Scenario: 构建校验入口依赖链
- **WHEN** 运行启动边界校验脚本
- **THEN** 脚本检查入口 HTML 及静态依赖图
- **AND** 若发现高频延后模块分组重新进入入口依赖链则返回失败
