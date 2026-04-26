# Service Worker Idle Prefetch 经验

## 背景

离线或弱网场景下，`idle-prefetch-manifest.json` 可能无法从当前源加载。该清单只用于更新后的空闲预取分组，不应阻塞首屏静态资源缓存、Service Worker 安装或更新就绪提示。

## 经验

1. Idle prefetch 是增强能力，不是启动前置条件。
   - 首屏必需资源应由 precache manifest 负责。
   - idle prefetch manifest 缺失时，应降级跳过，而不是长时间等待。

2. 离线场景不能把“清单不可达”当成致命错误。
   - `ERR_INTERNET_DISCONNECTED`、`TypeError: Failed to fetch`、HTML fallback 等都可能只是当前网络状态。
   - 更新流程应避免因为可选清单失败导致进度长期停住。

3. 等待循环要有明确退出策略。
   - 对用户可见的升级/加载流程，不应按分钟级等待可选资源。
   - 失败日志要说明“已跳过”而不是持续打印“waiting”。

4. 必需缓存和可选缓存要分层。
   - precache 失败可以阻止更新就绪。
   - idle prefetch 失败应记录状态，后续在线时再由默认预取或重试机制补齐。

5. 调试日志要体现降级语义。
   - 推荐日志：`skipped: manifest unavailable`。
   - 避免在可选资源路径上制造类似安装失败的误导性日志。

## 推荐做法

- 更新安装阶段：先完成 precache，再尝试 idle prefetch。
- idle manifest 不可用：记录原因并立即返回，不阻塞 `markNewVersionReady`。
- 激活后：继续依赖已有 idle prefetch 调度，在网络恢复后补齐可选资源。
