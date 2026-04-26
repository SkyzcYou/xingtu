# 二开版本静态资源 CDN 待办

## 背景

本仓库当前是基于 upstream 的二次开发版本。Vite 构建产物中的 `assets/index-*.js`、`assets/index-*.css` 以及其他 chunk 文件名由源码内容和构建结果决定，即使版本号与 upstream 相同，hash 文件也可能不同。

曾出现线上启动页卡在“正在唤起工作台”82% 的问题：线上 `index.html` 把首屏入口资源改写到 `https://cdn.jsdelivr.net/npm/aitu-app@0.6.74/...`，但这些入口 hash 是二开构建产物，upstream npm 包中不存在，jsdelivr 返回 404/text/plain，导致 React 主入口无法加载。

## 当前止血方案

首屏入口 JS/CSS 改为同源优先，不再使用 upstream jsdelivr 包作为入口资源来源。

当前原则：

- `index.html` 直接引用的入口 JS/CSS 使用 `./assets/...`。
- 二开构建产生的 hash 资源必须从我们自己的源站或我们自己的 CDN 获取。
- 不要让二开源站 HTML 引用 upstream npm 包 `aitu-app@version` 下的 hash 资源。

## 后续需要补的 CDN

如果后续需要 CDN 加速，应给我们的二开静态资源上 CDN，而不是复用 upstream 的 jsdelivr 包。

可选方案：

1. 给 `canvas.skyzcstack.space` 本身接入 CDN，让 CDN 回源到我们的部署源站。
2. 将 `dist/apps/web` 发布到我们自己的 npm 包，再使用我们自己的 jsdelivr 包名和版本。
3. 上传 `dist/apps/web/assets` 到对象存储/CDN，并确保 `index.html`、SW manifest、assets 来自同一份构建产物。

上线前必须验证：

```bash
grep -o 'https://cdn.jsdelivr.net/npm/aitu-app@[^"'"']*' dist/apps/web/index.html
```

对于二开版本，首屏入口资源不应指向 upstream `aitu-app` 包。

如果启用自己的 CDN，需要验证 HTML 中每个入口资源都存在且 MIME 正确：

```bash
curl -I '<entry-js-url>'   # 期望 200 + application/javascript 或 text/javascript
curl -I '<entry-css-url>'  # 期望 200 + text/css
```

## 关键提醒

版本号一致不代表构建产物一致。判断是否能使用某个 CDN 包，必须看 `index.html` 引用的具体 hash 文件是否真实存在于该 CDN，并返回正确 MIME 类型。
