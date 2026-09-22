## 6.7.28 (2026-09-22)

### 🚀 Features

- 补齐 GPT Image 2.5 尺寸与分辨率参数
- 完善 MiniMax-H3 V2 工作流与 2K 升级

### 🩹 Fixes

- 保留星图主题、帐号系统、积分支付和本地供应商定制

## 6.7.27 (2026-09-16)

### 🚀 Features

- 支持 MiniMax-H3 V1/V2 专用视频接口及首帧参考图
- 完善兔子账户工作区、用量日志与图片预览

### 🩹 Fixes

- 完善图片 Request ID 幂等恢复与安全节点切换
- 修复视频缓存响应处理，保留星图主题、帐号、积分支付及星流视频定制

## 6.7.26 (2026-09-14)

### 🚀 Features

- 接入 GPT Image 2.5 Sunburst 与 Flare 模型，完善尺寸与质量参数

### 🩹 Fixes

- 兔子图片请求及结果恢复改为直连上游，保留星图帐号与供应商定制

## 6.7.25 (2026-09-13)

### 🚀 Features

- 支持拖放参考图并接入 GPT Image 2.5 图片模型

### 🩹 Fixes

- 优化兔子帐号同步与模型加载，修复图片同源代理与请求标识
- 保留星图主题、帐号系统、积分支付和本地供应商配置

## 6.7.24 (2026-09-10)

### 🚀 Features

- 合并 upstream/main 并保留本地特色功能

## 6.7.23 (2026-09-08)

### 🩹 Fixes

- 在获取模型前检查 Base URL，避免地址留空时请求默认站点

### ✨ Improvements

- 移除供应商设置中的端点候选列表、自动加载和测速选址，改为手动填写 Base URL

## 6.7.22 (2026-09-08)

### 🩹 Fixes

- 切换星图 API 默认节点至 apius.tu-zi.com，修复旧节点跨域异常导致的图片生成失败
- 修复聊天生成设置回传导致的 React 重复更新

## 6.7.21 (2026-09-07)

### 🚀 Features

- 合入上游 AI 语义分层、任务栏目标跟随、图片请求恢复与 PPT 讲解工作流

### 🩹 Fixes

- 保留星图主题、帐号鉴权、积分支付与星流供应商定制

## 6.7.20 (2026-07-15)

### 🚀 Features

- add async image jobs and playground history (b2f01671)

### ❤️  Thank You

- SkyzcYou <youzhengcai@gmail.com>

## 6.7.19 (2026-07-13)

### 🚀 Features

- add noipay backend payment provider (4c1bbbc8)
- support noipay QR recharge (32ffeeba)

### ❤️  Thank You

- SkyzcYou <youzhengcai@gmail.com>

## 6.7.16 (2026-06-26)

### 🚀 Features

- 补齐工作流媒体结果交互 (4d359aaa)

### 🩹 Fixes

- 修复画布分组插入布局 (e281ca3d)

### ❤️  Thank You

- SkyzcYou <youzhengcai@gmail.com>

## 6.7.15 (2026-06-16)

### 🔧 Chores

- 修复 PR188 文本内容数组归一化 (b661f2a8)
- 修复多图生成 JSON 解析和默认模型迁移 (979d04a2)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- 水滴鱼 <shuidiyu@shuidiyudeMacBook-Neo.local>

## 6.7.14 (2026-06-14)

### 🚀 Features

- port upstream workflow media features (a93db955)
- add profile credit recharge entry (04efbe10)
- add new user bonus credits (10fb9362)

### 🩹 Fixes

- refine credit recharge payment flow (40b45bb3)

### ❤️  Thank You

- SkyzcYou <youzhengcai@gmail.com>

## 6.7.13 (2026-05-29)

### 🚀 Features

- add dynamic message center (91730ca1)
- show account credits in profile and refresh OIDC tokens (09896211)
- add admin credit management console (17d2b8d6)
- add account credits and charged LLM proxy (a5dc59fd)
- support Xingtu account provider auth (20f3cb72)
- harden backend llm proxy (9d9c21b8)
- update backend web admin console (fc6af9cf)
- 新增 backend web 管理控制台 (e95de0a3)
- 新增 omni-flash 视频模型支持 (248af3f7)
- 画布图片选中状态锁定优化 (12517bd7)
- 支持同步账户 API 配置 (10589a40)
- 支持当前页登录回跳 (bad69c18)
- 新增青科支付 MVP (22ca573f)
- 支持侧边栏资料与弹窗登录 (1e82523b)
- 支持打开个人资料窗口 (1a365e2c)
- 供应商设置增加「图片优先使用异步接口」开关 (1fc6aadc)
- sync media library batch select functionality across AIInputBar and EnhancedChatInput (cffb6b42)
- 添加批量插入功能 (344c28a2)
- improve chat drawer workflow generation (5da07cac)

### 🩹 Fixes

- show provider tooltip above model picker (5e289a04)
- persist API key provider after auth prompt (9bdf3fa2)
- show account status on toolbar avatar (0417c97e)
- route auth prompt through settings flow (410bd39c)
- complete glass themed generation windows (42b7591a)
- prioritize Xingtu account model group (3c683050)
- restore AI input after account login (c1a1c59d)
- 统一图片尺寸计算机制，修复批量插入叠加问题 (6c166910)
- 修复图片尺寸相关问题（真实尺寸更新、批量插入叠加） (b04cfc27)
- 补修 MCP 路径 lockReferenceDimensions=true，更新完整审计文档 (6006c7ff)
- 修复图片生成比例错误和 API 参数兼容性问题 | 修复 buildImageRequestBody 中 size 为比例格式时未转换像素尺寸(所有非1:1比例都生成1:1) | 移除 response_format url 参数(rix API 不支持) | 修复 lockReferenceDimensions 导致非正方形图片被压缩 (982e6271)
- 修复 MJ 运行时模型参数与调度路由 (fb464a86)
- 更新网站首页入口 (38854fad)
- 优化后端生产配置与请求超时 (8e19f5db)
- 修复异步图片接口开关路由 (e6d10834)
- 移除图片接口默认 response_format (c1207e2f)
- 异步接口开关持久化 + 图片任务刷新后恢复轮询 (08f05614)
- split batch media action copy by target context (3332459b)
- support bulk media insertion and image generation compatibility (3156c1ac)

### 🔧 Chores

- bump web version metadata (95640880)
- bump version to 6.7.12 (6f18038d)
- bump version to 6.7.11 (8dc3b17b)
- bump version to 0.9.9 (26ed328a)
- 添加 Docker 部署示例 (ed4011b9)
- bump version to 0.9.8 (db9efd71)
- bump version to 0.9.7 (35aba9f3)
- docs: 补充跨 AI 提供商兼容性分析size 比例转换不影响其他 API 生图 (edb129b7)
- docs: 图片生成API参数兼容性与比例转换修复经验总结 (5c06b488)
- 文档：补充模型分类优先级经验 (b5f1d169)
- 调整运行时模型分类优先级并补充 category 回归测试 (805014d3)
- 发布 (9bce5497)
- 修复：同步聊天抽屉素材库批量选择 (06fee16e)
- 更新应用版本到 0.9.8 (a70d1053)
- Refactor canvas batch insertion to viewport flow layout (04f42a12)
- 修复对话输入框内层描边并抽出共享壳 (8be4a467)
- 聊天抽屉图片预览收口到列表层 (8afea976)
- 补充首屏壳层与 chunk 守门经验 (f8f4b8f7)
- 修复素材库配色与多选架构，补充UI规范和架构说明 (8c233640)
- 修复：蒙版预览缓存不进入素材库 (94dbf95e)
- Bump web app version to 0.9.7 (3bc2abe0)
- revert: restore original image generation behavior (e12dec48)

### ❤️  Thank You

- SkyzcYou <youzhengcai@gmail.com>
- 李泓震 <15900797+AiW520@user.noreply.gitee.com>
- gongchengtu <1817063960@qq.com>
- liquid <ljquan@qq.com>
- liangkaijun <2290804689@qq.com>
- lichenyi <lichenyi@qq.com>
- SaulgoodMan-C <271131037+SaulgoodMan-C@users.noreply.github.com>

## 6.7.10 (2026-05-17)

### 🚀 Features

- 支持头像账户菜单入口 (a03092c7)
- 使用星球头像生成器 (64cb63eb)

### 🔧 Chores

- style(工具栏): 内嵌头像并恢复移动拖动 (47cdd2ee)

### ❤️  Thank You

- SkyzcYou <youzhengcai@gmail.com>

## 6.7.9 (2026-05-17)

### 🚀 Features

- 隐藏菜单并添加品牌触发 (ee0a4c6a)

### 🔧 Chores

- style(移动端): 调整折叠工具栏快捷入口 (1101e940)
- style(移动端): 固定工具栏到左上角 (c62453b6)
- style(界面): 优化品牌标识与模型标签提示 (bdd81461)

### ❤️  Thank You

- SkyzcYou <youzhengcai@gmail.com>

## 6.7.8 (2026-05-17)

### 🔧 Chores

- style(对话抽屉): 完成主题化与宽度联动 (322adce4)
- style(画布): 主题化 WorkZone 进度卡片 (3651893f)

### ❤️  Thank You

- SkyzcYou <youzhengcai@gmail.com>

## 6.7.7 (2026-05-16)

### 🚀 Features

- 接入 Ferriskey OIDC MVP (c00d22d3)

### 🔧 Chores

- 统一星图品牌与链接 (7caec3d1)

### ❤️  Thank You

- SkyzcYou <youzhengcai@gmail.com>

## 6.7.6 (2026-05-16)

### 🚀 Features

- 定制星流视频参数 (07dcf8d3)
- 支持供应商视频参数配置 (f5adfb46)
- 优化星图首页视觉叙事 (7efde295)
- 统一星图毛玻璃浮层与窗口样式 (5eac56ac)
- 优化中性毛玻璃主题与画布交互 (6933efac)
- 添加中性主题与毛玻璃样式 (2cbc6c46)
- 为绘图工具添加键盘快捷键调整大小功能 (26049f2d)
- support AI image mask editing (3a33e873)
- 优化长提示词输入框展开体验 (241a18fe)
- 优化长提示词输入框展开体验 (63af0124)
- add image generate-again prefill (9812fd10)
- 为视频生成 prompt 添加参考图用途说明 (95b7722d)
- 支持异步图片生成和生成素材重置 (d5fdb613)
- add image generate-again prefill (c08306bc)
- 添加目标总时长配置并优化UI与错误处理 (abff6536)
- 优化价格展示增加Bussiness (a2ba39ae)
- update app version to 0.6.96 and add image generation message type (65b5cf71)
- enhance audio asset handling in workflow export and improve caching logic (55000ab6)
- 优化视频工作流批量生成 (80732a5d)
- add image 3d transform panel (97fc60e4)
- enhance service worker handling and update video generation logic (37fc4ee2)
- refresh Xingtu brand assets (81308b2b)
- move feedback QR codes into message center (2be7d7e8)
- 在历史记录中显示创建时间并调整排序 (db7d44a4)
- 新增 HappyHorse 视频模型支持并重构工作流外壳 (7f297f5e)
- 完善多图生成视觉提示词工作流 (0f11b9c7)
- 优化多图生成提示词预览 (459b4e31)
- 支持完整环境备份与覆盖恢复 (9e593e94)
- 添加PPT生成参考图片支持并修复React组件卸载问题 (b470e504)
- add message center drawer (0888719f)
- add manual update check in app menu (fd9da1e1)
- update API key help defaults and support prompt (f0159669)
- add QR support options for API key help (dfbf2485)
- update browser tab title branding (51b80800)
- update default OpenAI image model (e3202fd1)
- hide pricing UI from provider settings (2bb52f4e)
- Update boot screen brand text (d5d36f66)
- Update feedback QR code asset (c09f5df8)
- Update left menu website entry (ae3285b4)

### 🩹 Fixes

- 跟随主题优化玻璃样式 (c829ff8d)
- 修复手动检查更新确认入口丢失 (27bfa36f)
- 优化输入栏弹窗与设置窗口适配 (3ff59297)
- 修复批量导入图片弹窗显示异常 (77e6df4c)
- 修复蒙版画笔导出和预览样式问题 (69f94d26)
- keep send button visible (ef75dadb)
- resume async image tasks after reload (4ed9402f)
- 优化参考图描述和提示词优先级协议 (457cc0e7)
- allow hand panning while drawing (7beb5c86)
- 修复隐藏灵感板后输入框圆角 (22ba999f)
- address regenerate prefill review findings (ff39ffef)
- 移除生成视频时重复的提示词构建逻辑 (7edd47d9)
- 强化爆款视频首尾帧角色一致性 (743a7afa)
- 绑定异步任务供应商路由 (3a56d795)
- unify generated image retry rendering (70acfa65)
- parallelize character reference generation (1b17f80a)
- pass image transform context to AI (e642f466)
- prevent false refresh interruption failures (0bacce39)
- prevent first-party assets from using jsdelivr (5eba922a)
- 优化页面卡片布局并修复提示词回填逻辑 (4770cf33)
- 强化历史收藏入口并放宽 AI 并发 (4e952541)
- 防止复制粘贴事件在可编辑元素中触发 (00d767f4)
- 修正任务队列批量序号显示 (ae172b8d)
- 修复多图生成队列参数并记录经验 (dac73844)
- 优化媒体预览缩放同步 (269c02d5)
- 优化媒体预览自适应展示 (d30183f2)
- 修复 Milkdown 节点上下文注册顺序 (a8bf269d)
- 改进部署包关键资源检查逻辑 (1a457d02)
- 修复图片生成完成后画布自动插入卡住 (e383c362)
- 改进动态导入错误恢复机制并优化错误处理 (3781c354)
- guard toImage fetch failures (dff2f46a)
- avoid upstream cdn entry assets for fork build (b53748cf)
- recover image auto-insert completion (82b51b89)
- resolve merge leftovers for gpt-image-2 (871323b7)
- restore gpt-image-2 as default image model (ae4027ee)
- use local support QR in error boundary (045a4d49)
- normalize gpt-image-2 image sizes (5622f169)
- Correct embedded website toolbar link (478d2542)

### 🔧 Chores

- bump version to 6.7.5 (ae0b5620)
- bump version to 0.7.4 (798ff6a7)
- bump version to 0.7.3 (1801ce20)
- 更新版本号至0.9.6并同步构建时间 (9b9fb552)
- bump version to 0.9.6 (b4c97e0d)
- 更新应用版本至0.9.5并刷新构建时间 (ec03ee90)
- bump version to 0.9.5 (6ab0617b)
- bump version to 0.9.4 (46e13e11)
- bump version to 0.9.3 (6d26b892)
- 调整星图本地版本线 (d097cb90)
- 更新版本号至0.9.2并刷新构建时间 (0c4b383d)
- bump version to 0.9.2 (0eb87e63)
- 更新版本至0.9.0并增强部署脚本 (38adcb97)
- bump version to 0.9.1 (c1617975)
- bump version to 0.9.0 (e66a8b43)
- bump version to 0.8.0 (ea01d364)
- bump version to 0.7.0 (5e409295)
- 保留星图上游差异配置 (30e1c296)
- 更新应用版本号至0.6.99并同步构建时间 (60daf04e)
- bump version to 0.6.99 (7da6ffdc)
- 更新应用版本至0.6.98并同步构建时间 (a09a6a0e)
- bump version to 0.6.98 (126612d1)
- 更新应用版本至0.6.97 (dc254677)
- bump version to 0.6.97 (1df3a822)
- bump version to 0.6.96 (d25b58c7)
- 补充视频主体引用经验 (24363fcd)
- disable PostHog reporting by default (b5246d30)
- refresh web version build time (c4c62083)
- 更新应用版本号至0.6.95并刷新构建时间 (a6a8aed9)
- bump version to 0.6.95 (6a0fe4af)
- 更新应用版本号至0.6.94并刷新构建时间 (34659c05)
- bump version to 0.6.94 (c53b5973)
- 更新应用版本至0.6.93并刷新构建时间 (fcc19f31)
- bump version to 0.6.93 (6c3609b9)
- 更新应用版本号至0.6.92并同步构建时间 (abf59634)
- bump version to 0.6.92 (2bd99838)
- 同步 0.6.91 Web 版本元数据 (50fe68d0)
- bump version to 0.6.91 (17a20fcc)
- 更新应用版本至0.6.90并刷新构建时间 (2ca0b092)
- bump version to 0.6.90 (f7234c63)
- 更新应用版本号至0.6.89 (9ebe98d3)
- bump version to 0.6.89 (383a95fb)
- 添加 mermaid 依赖用于图表渲染 (2999f6f1)
- 更新应用版本号至0.6.88并同步构建时间 (84e6f206)
- bump version to 0.6.88 (74817273)
- 更新应用版本号至0.6.87并同步构建时间 (aa97f83f)
- update public branding to Xingtu (c57e9929)
- improve docker build and local deployment (da7d7209)
- Stop idle-prefetch retries from blocking SW updates (d2d51319)
- refactor(settings-dialog): 提取 MessagePlugin 工具并移除供应商域名字段 (47708bb2)
- refactor: 统一 AI JSON 响应解析并优化样式与功能 (dc91f938)
- refactor: 合并创作 Brief 用途场景字段 (f95fde73)
- style(组件样式): 统一复选框样式并使用CSS变量 (f7411cb1)
- refactor(drawnix): 统一 HoverTip 提示规范 (533b06a1)
- Refresh docs, CI, and Docker build (a614f3e5)
- perf(changelog): 限制解析的版本数量以避免内存问题 (647d77b7)
- style(project-drawer): 重构PPT大纲面板样式以改进布局结构 (c77741bb)
- refactor: Remove user manual menu entry (6a4e7e67)
- refactor: Simplify app menu version entry (6ce224f4)
- Refine compose deployment defaults (56f51619)
- Add Docker build and ECS deployment config (482918dd)

### ❤️  Thank You

- SkyzcYou <youzhengcai@gmail.com>
- gongchengtu <1817063960@qq.com>
- liquid <ljquan@qq.com>

## 0.7.3 (2026-05-10)

### 🚀 Features

- 统一星图毛玻璃浮层与窗口样式 (5eac56ac)

### 🩹 Fixes

- 优化输入栏弹窗与设置窗口适配 (3ff59297)

## 0.7.2 (2026-05-10)

### 🩹 Fixes

- 修复批量导入图片弹窗显示异常

## 0.9.9 (2026-05-18)

### 🚀 Features

- 供应商设置增加「图片优先使用异步接口」开关 ([1fc6aadc](https://github.com/ljquan/aitu/commit/1fc6aadc))

### 🩹 Fixes

- 异步接口开关持久化 + 图片任务刷新后恢复轮询 ([08f05614](https://github.com/ljquan/aitu/commit/08f05614))

### 🔧 Chores

- 修复：同步聊天抽屉素材库批量选择 ([06fee16e](https://github.com/ljquan/aitu/commit/06fee16e))
- 更新应用版本到 0.9.8 ([a70d1053](https://github.com/ljquan/aitu/commit/a70d1053))

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.9.8 (2026-05-17)

### 🚀 Features

- 添加批量插入功能 ([344c28a2](https://github.com/ljquan/aitu/commit/344c28a2))
- improve chat drawer workflow generation ([5da07cac](https://github.com/ljquan/aitu/commit/5da07cac))

### 🩹 Fixes

- split batch media action copy by target context ([3332459b](https://github.com/ljquan/aitu/commit/3332459b))
- support bulk media insertion and image generation compatibility ([3156c1ac](https://github.com/ljquan/aitu/commit/3156c1ac))

### 🔧 Chores

- bump version to 0.9.7 ([35aba9f3](https://github.com/ljquan/aitu/commit/35aba9f3))
- Refactor canvas batch insertion to viewport flow layout ([04f42a12](https://github.com/ljquan/aitu/commit/04f42a12))
- 修复对话输入框内层描边并抽出共享壳 ([8be4a467](https://github.com/ljquan/aitu/commit/8be4a467))
- 聊天抽屉图片预览收口到列表层 ([8afea976](https://github.com/ljquan/aitu/commit/8afea976))
- 补充首屏壳层与 chunk 守门经验 ([f8f4b8f7](https://github.com/ljquan/aitu/commit/f8f4b8f7))
- 修复素材库配色与多选架构，补充UI规范和架构说明 ([8c233640](https://github.com/ljquan/aitu/commit/8c233640))
- 修复：蒙版预览缓存不进入素材库 ([94dbf95e](https://github.com/ljquan/aitu/commit/94dbf95e))
- Bump web app version to 0.9.7 ([3bc2abe0](https://github.com/ljquan/aitu/commit/3bc2abe0))
- revert: restore original image generation behavior ([e12dec48](https://github.com/ljquan/aitu/commit/e12dec48))

### ❤️  Thank You

- liquid <ljquan@qq.com>
- lichenyi <lichenyi@qq.com>
- SaulgoodMan-C <271131037+SaulgoodMan-C@users.noreply.github.com>

## 0.9.7 (2026-05-09)

### 🩹 Fixes

- 修复批量导入图片弹窗显示异常 ([77e6df4c](https://github.com/ljquan/aitu/commit/77e6df4c))

### 🔧 Chores

- 更新版本号至0.9.6并同步构建时间 ([9b9fb552](https://github.com/ljquan/aitu/commit/9b9fb552))

### ❤️  Thank You

- gongchengtu <1817063960@qq.com>
- liquid <ljquan@qq.com>
