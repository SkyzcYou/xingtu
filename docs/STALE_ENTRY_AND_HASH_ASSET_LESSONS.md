# 旧入口与悬空 Hash 资源经验总结

更新日期：2026-04-22

## 现象

线上会出现这样的请求：

- `https://opentu.ai/assets/index-Bfl2zVkU.js`

但当前本地构建里：

- 没有这个文件
- 当前 `version.json` 已经是新版本
- 当前 `index.html` 里写死的首屏入口也已经是新的 hash

最终表现是：

- 线上请求一个本地根本不存在的旧 hash 资源
- 资源 `404`
- 页面继续卡在半启动状态

## 先说结论

这类问题，**几乎不可能是“当前构建自己算错了入口名”**。  
更常见的根因是：**线上仍有旧入口链路在生效**。

也就是说，请求旧 hash 资源，通常不是新包生成出来的，而是以下某一层还没切干净：

- 旧 `index.html`
- 旧 `Service Worker`
- 旧缓存清单
- 非原子部署导致的“旧入口 + 新 assets”错配

## 这次排查得到的判断依据

本地核对时，如果同时满足下面几条，就可以基本排除“当前构建有问题”：

- [apps/web/public/version.json](/Users/ljq/code/shuidiyu/aitu/apps/web/public/version.json) 是新版本
- [apps/web/index.html](/Users/ljq/code/shuidiyu/aitu/apps/web/index.html) 的 `app-version` 是新版本
- 打包后的 [dist/apps/web/index.html](/Users/ljq/code/shuidiyu/aitu/dist/apps/web/index.html) 里首屏 `type="module"` 入口已经是另一条新 hash
- [dist/apps/web/precache-manifest.json](/Users/ljq/code/shuidiyu/aitu/dist/apps/web/precache-manifest.json) 里没有旧 hash
- [dist/apps/web/assets](/Users/ljq/code/shuidiyu/aitu/dist/apps/web/assets) 目录里也没有旧 hash

如果这五条都成立，而线上还在请求旧 hash，那么就说明：

**问题发生在线上入口一致性，不在当前本地构建。**

## 根因分类

### 1. 旧 HTML 还在返回

最常见。

例如：

- 浏览器拿到的是旧版 `index.html`
- 这个旧 HTML 里仍然引用 `index-Bfl2zVkU.js`
- 但服务器上的 `assets` 已经切成了新版本
- 旧 hash 文件被删掉或覆盖，于是直接 `404`

经验：

- 只看服务器目录里有没有新文件，不够
- 一定要看用户真正拿到的 `index.html` 是不是新版本

### 2. 旧 SW 还在接管页面

即使 HTML 是新的，也可能出现：

- 浏览器仍被旧 `Service Worker` 控制
- 旧 SW 里缓存了旧入口或旧资源映射
- 结果页面继续请求已经失效的 hash 文件

经验：

- “页面刷新了”不等于“SW 已切到新版本”
- 尤其是首屏加载链路里，SW 的生命周期和 HTML 更新不是同一步完成的

### 3. 部署不是原子切换

这类问题本质上是版本错配。

错误顺序通常像这样：

1. 先清理或覆盖旧 `assets`
2. 用户手里仍有旧 HTML / 旧 SW
3. 旧入口继续请求旧 hash
4. 服务器上该文件已不存在
5. 直接悬空 `404`

经验：

- hash 资源不是“删旧文件就完事”
- 只要线上还有旧入口引用它，就不能立刻清掉

## 这次最值得固化的规则

### 1. 排查这类问题，先分清“请求是谁发起的”

要先回答两个问题：

- 这个旧 hash 是当前构建产物里写进去的吗？
- 还是某个旧 HTML / 旧 SW / 旧缓存发起的？

如果不先分层，排查很容易跑偏，最后误以为是“打包器有 bug”。

### 2. 不要把“资源 404”直接归因到构建

当线上请求本地不存在的旧 hash 时，第一反应不该是：

- 当前构建产物生成错了

更应该优先怀疑：

- 入口链路未完全切换
- 缓存未清干净
- 部署顺序不安全

### 3. HTML、SW、assets 必须按“版本一致性”设计部署

前端静态站不是只部署 `assets` 就行。

真正要保证一致性的至少有三类文件：

- `index.html`
- `sw.js` 与相关缓存清单
- `assets/*.js` / `assets/*.css`

只要它们切换不是同一版本视角，就会出现旧入口引用新资源或新入口引用旧缓存的问题。

## 推荐的排障顺序

### 第一步：确认本地产物有没有这个旧 hash

查三处：

- 打包后的 `index.html`
- 预缓存清单
- `dist/assets`

如果都没有，基本可以判断不是当前构建写进去的。

### 第二步：确认线上返回的 `index.html` 是谁

重点看：

- `app-version`
- 首屏 `module` 入口脚本
- 缓存头是否过久

### 第三步：确认线上 SW 是否仍是旧版本

重点看：

- `sw.js` 内容或版本标识
- 预缓存清单版本
- 是否存在旧 cache key

### 第四步：回看部署顺序

重点确认：

- 是否先删旧 assets
- 是否旧 HTML 仍可能被 CDN / 浏览器缓存命中
- 是否给旧入口留了过短的存活窗口

## 后续应该怎么设计更稳

### 1. 部署要尽量原子

推荐原则：

- 新 HTML、生效中的 SW、对应 assets 应该成套发布
- 不要出现“新旧资源混挂”的过渡窗口

### 2. 不要过早清理旧 hash 资源

更稳的策略是：

- 允许旧版本 hash 资源保留一个短暂过渡期
- 等确认旧 HTML / 旧 SW 基本退出后再清理

一句话：  
**hash 资源可以延迟清理，首屏入口一致性不能冒险。**

### 3. SW 升级链路要可观测

至少要能看出：

- 当前页面由哪个 SW 控制
- 当前 cache 清单属于哪个版本
- 当前启动入口来自 HTML、SW 还是缓存恢复

否则这类问题到了线上基本只能猜。

## 一句话总结

线上请求“本地构建里根本不存在的旧 hash 资源”，通常不是当前构建错了，而是：

- 旧 HTML 还在返回
- 旧 SW 还在接管
- 或部署不是原子切换

真正该修的，不只是资源路径，而是**入口一致性与部署时序**。 🔧
