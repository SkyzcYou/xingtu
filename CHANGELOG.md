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

## 0.9.6 (2026-05-06)

### 🚀 Features

- 为绘图工具添加键盘快捷键调整大小功能 (26049f2d)

### 🔧 Chores

- 更新应用版本至0.9.5并刷新构建时间 (ec03ee90)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.9.5 (2026-05-06)

### 🩹 Fixes

- 修复蒙版画笔导出和预览样式问题 (69f94d26)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.9.4 (2026-05-06)

### 🔧 Chores

- Stop idle-prefetch retries from blocking SW updates (d2d51319)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.9.3 (2026-05-06)

### 🚀 Features

- support AI image mask editing (3a33e873)

### 🩹 Fixes

- keep send button visible (ef75dadb)
- resume async image tasks after reload (4ed9402f)

### 🔧 Chores

- 更新版本号至0.9.2并刷新构建时间 (0c4b383d)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.9.2 (2026-05-04)

### 🚀 Features

- 优化长提示词输入框展开体验 (241a18fe)
- add image generate-again prefill (9812fd10)

### 🩹 Fixes

- 优化参考图描述和提示词优先级协议 (457cc0e7)
- allow hand panning while drawing (7beb5c86)
- address regenerate prefill review findings (ff39ffef)

### 🔧 Chores

- 更新版本至0.9.0并增强部署脚本 (38adcb97)
- bump version to 0.9.1 (c1617975)
- bump version to 0.9.0 (e66a8b43)
- bump version to 0.8.0 (ea01d364)
- bump version to 0.7.0 (5e409295)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- SkyzcYou <youzhengcai@gmail.com>

## 0.7.0 (2026-05-03)

### 🩹 Fixes

- allow hand panning while drawing (60c4828b)

### 🔧 Chores

- 更新应用版本号至0.6.99并同步构建时间 (60daf04e)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.99 (2026-05-03)

### 🚀 Features

- 为视频生成 prompt 添加参考图用途说明 (95b7722d)
- 支持异步图片生成和生成素材重置 (d5fdb613)
- 添加目标总时长配置并优化UI与错误处理 (abff6536)

### 🩹 Fixes

- 移除生成视频时重复的提示词构建逻辑 (7edd47d9)
- 强化爆款视频首尾帧角色一致性 (743a7afa)
- 绑定异步任务供应商路由 (3a56d795)
- unify generated image retry rendering (70acfa65)

### 🔧 Chores

- 更新应用版本至0.6.98并同步构建时间 (a09a6a0e)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.98 (2026-05-02)

### 🔧 Chores

- 更新应用版本至0.6.97 (dc254677)
- refactor(settings-dialog): 提取 MessagePlugin 工具并移除供应商域名字段 (47708bb2)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.97 (2026-05-02)

### 🚀 Features

- 优化价格展示增加Bussiness (a2ba39ae)
- update app version to 0.6.96 and add image generation message type (65b5cf71)

### 🩹 Fixes

- parallelize character reference generation (1b17f80a)

### 🔧 Chores

- refactor: 统一 AI JSON 响应解析并优化样式与功能 (dc91f938)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.96 (2026-05-01)

### 🚀 Features

- enhance audio asset handling in workflow export and improve caching logic (55000ab6)
- 优化视频工作流批量生成 (80732a5d)
- add image 3d transform panel (97fc60e4)
- enhance service worker handling and update video generation logic (37fc4ee2)

### 🩹 Fixes

- pass image transform context to AI (e642f466)

### 🔧 Chores

- 补充视频主体引用经验 (24363fcd)
- 更新应用版本号至0.6.95并刷新构建时间 (a6a8aed9)
- refactor: 合并创作 Brief 用途场景字段 (f95fde73)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.95 (2026-04-30)

### 🩹 Fixes

- 优化页面卡片布局并修复提示词回填逻辑 (4770cf33)

### 🔧 Chores

- 更新应用版本号至0.6.94并刷新构建时间 (34659c05)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.94 (2026-04-30)

### 🩹 Fixes

- 强化历史收藏入口并放宽 AI 并发 (4e952541)

### 🔧 Chores

- 更新应用版本至0.6.93并刷新构建时间 (fcc19f31)
- style(组件样式): 统一复选框样式并使用CSS变量 (f7411cb1)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.93 (2026-04-30)

### 🩹 Fixes

- 防止复制粘贴事件在可编辑元素中触发 (00d767f4)

### 🔧 Chores

- 更新应用版本号至0.6.92并同步构建时间 (abf59634)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.92 (2026-04-30)

### 🚀 Features

- 在历史记录中显示创建时间并调整排序 (db7d44a4)
- 新增 HappyHorse 视频模型支持并重构工作流外壳 (7f297f5e)
- 完善多图生成视觉提示词工作流 (0f11b9c7)
- 优化多图生成提示词预览 (459b4e31)

### 🩹 Fixes

- 修正任务队列批量序号显示 (ae172b8d)
- 修复多图生成队列参数并记录经验 (dac73844)
- 优化媒体预览缩放同步 (269c02d5)
- 优化媒体预览自适应展示 (d30183f2)
- 修复 Milkdown 节点上下文注册顺序 (a8bf269d)

### 🔧 Chores

- 同步 0.6.91 Web 版本元数据 (50fe68d0)
- refactor(drawnix): 统一 HoverTip 提示规范 (533b06a1)
- Refresh docs, CI, and Docker build (a614f3e5)
- perf(changelog): 限制解析的版本数量以避免内存问题 (647d77b7)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.91 (2026-04-29)

### 🚀 Features

- 支持完整环境备份与覆盖恢复 (9e593e94)

### 🩹 Fixes

- 改进部署包关键资源检查逻辑 (1a457d02)

### 🔧 Chores

- 更新应用版本至0.6.90并刷新构建时间 (2ca0b092)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.90 (2026-04-29)

### 🔧 Chores

- 更新应用版本号至0.6.89 (9ebe98d3)
- style(project-drawer): 重构PPT大纲面板样式以改进布局结构 (c77741bb)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.89 (2026-04-29)

### 🚀 Features

- 添加PPT生成参考图片支持并修复React组件卸载问题 (b470e504)

### 🩹 Fixes

- 修复图片生成完成后画布自动插入卡住 (e383c362)

### 🔧 Chores

- 添加 mermaid 依赖用于图表渲染 (2999f6f1)
- 更新应用版本号至0.6.88并同步构建时间 (84e6f206)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.6.88 (2026-04-28)

### 🩹 Fixes

- 改进动态导入错误恢复机制并优化错误处理 (3781c354)
- guard toImage fetch failures (dff2f46a)

### 🔧 Chores

- 更新应用版本号至0.6.87并同步构建时间 (aa97f83f)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.87 (2026-04-28)

### 🚀 Features

- 为 API Key 输入框添加显示/隐藏切换功能 (87d79796)

### 🩹 Fixes

- stabilize GPT image generation requests (d478c883)
- retry failed image generation anchors (9755447a)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.86 (2026-04-28)

### 🔧 Chores

- 更新版本号至 0.6.85 并同步构建时间 (f1613719)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.85 (2026-04-28)

### 🚀 Features

- 增强懒加载资源恢复与SEO优化 (c16b4d59)

### 🩹 Fixes

- 修复 default 分组迁移类型检查 (7f4ec5c3)
- 调整 default 分组 GPT Image 默认路由 (c789bda1)

### ❤️  Thank You

- gongchengtu <1817063960@qq.com>
- liquid <ljquan@qq.com>

## 0.6.84 (2026-04-28)

### 🔧 Chores

- perf: slim startup dependencies without visual regressions (3103325d)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.83 (2026-04-28)

### 🚀 Features

- 优化懒加载和构建配置，添加分析埋点 (4438a44f)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.82 (2026-04-27)

### 🔧 Chores

- 更新应用版本号至0.6.81并同步构建时间 (a435015f)
- docs: 补充循环依赖防回归规则 (47adb657)
- refactor: 收敛剩余循环依赖 (a184ecab)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.81 (2026-04-27)

### 🩹 Fixes

- 修复画布批量拖拽媒体定位 (b0933fee)
- 收敛静态循环依赖 (556a56f1)
- 选中PPT页面时素材插入页面内 (1b65b885)
- 自动重排删除后的 PPT 页面 (05d78509)
- 改进API认证错误处理以区分缺失与无效凭证 (89a9b83b)
- 修复图片骨架屏加载期间透明度计算逻辑 (834e50c4)
- support right dock drawer avoidance (04ab497a)

### 🔧 Chores

- 更新应用版本至0.6.80并同步构建时间 (721d9b96)
- refactor: 延迟加载第三方库并重构模块依赖 (cf64c911)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.80 (2026-04-27)

### 🚀 Features

- 启用 GPT-5.5 模型配置 (cb97b283)

### 🩹 Fixes

- tighten media cache warnings (e71cb815)
- refine left floating toolbar drawer alignment (8255bde4)
- clear task failure badge after viewing (b574bfbb)
- 优化素材库渲染性能 (bf713cd5)
- 完善 PPT 标题文件名和媒体导出 (0f8a2fcd)

### 🔧 Chores

- 更新应用版本号至0.6.79并同步构建时间 (5af73dc1)
- docs: record home sw prefetch lesson (b5e06667)
- Add home SEO alternates and SW prefetch (aaeab363)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.79 (2026-04-26)

### 🚀 Features

- 添加提示词历史工具并集成到AI输入栏 (d3e63998)
- 为歌曲创作页面添加提示词优化功能 (ff373c31)

### 🩹 Fixes

- sync prompt history selectors (f82a39fe)
- 本地开发默认启用 Service Worker (d27c8494)
- 确保虚拟图片链接在当前页由 SW 接管 (f5f556ad)
- 恢复画布图片稳定虚拟 URL 缓存链路 (26433192)
- 修复粘贴图片画布展示兜底 (fd800afa)

### 🔧 Chores

- slim npm dependencies (56232ee6)
- 移除开发调试日志并添加PPT与提示词分析文档 (835aa9c1)
- 更新应用版本至0.6.78并刷新构建时间 (9b5c478b)
- test(ai-input-bar): 添加打开我的提示词弹窗前回调测试 (7a5c257e)
- refactor: centralize prompt optimization (a41c5e57)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.78 (2026-04-26)

### 🚀 Features

- add PPT common prompt history (9c41c60e)
- add PPT outline image preview action (0f1dddae)
- 分离公共提示词与单页提示词，优化幻灯片生成流程 (20854ff0)
- add ppt outline generation flow (af35d4ae)
- 改造提示词优化多轮交互 (913ba764)
- 优化 PPT 编辑与生成模型体验 (f19c02ff)

### 🩹 Fixes

- align model dropdown checkmark (095d9f1a)
- 优化 PPT 大纲提示词与替换逻辑 (ff22ecc9)
- 优化 PPT 生图可见文字提示词 (4179fa8c)
- unify ai generation params (06922627)
- 避免关闭 SW 时通道初始化超时 (8548dfc8)
- 用 WinBox 承载优化弹窗 (2f49bddc)
- 调整默认文本模型与选择器顺序 (53485977)
- 提升 PPT 生图风格一致性 (77a4acb1)
- ensure PPT media displays fully (e5291e64)
- 稳定 PPT 生图历史顺序 (c4200a00)
- 统一 PPT 页面客户术语 (fb2b2c06)
- 修复生图插入重试重复插入问题 (6670f8bc)
- 修复 GPT Image 编辑尺寸映射 (f39813ad)
- align prompt preview flows and refresh default samples (595d4f03)
- autosize ai input textarea (2d2d6441)

### 🔧 Chores

- 更新应用版本号至0.6.77并刷新构建时间 (5c32fee5)
- docs(home): 添加作者X链接至页眉、页脚和结构化数据 (89980b72)
- 优化提示词预览与内置提示词 (82ac84aa)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>
- SaulgoodMan-C <271131037+SaulgoodMan-C@users.noreply.github.com>

## 0.6.77 (2026-04-25)

### 🩹 Fixes

- 修复非根路径部署时的资源加载问题 (9d8d4c8b)
- 增强 Vite 构建文件句柄重试 (cee1ab01)

### 🔧 Chores

- bump version to 0.6.76 (587a0547)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.76 (2026-04-25)

### 🚀 Features

- 新增 Xingtu SEO 首页 (99fca746)

### 🔧 Chores

- 更新版本号至0.6.75并同步构建时间 (cefc3cb1)
- style(homepage): 优化主页布局与视觉设计 (e23cdfab)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.75 (2026-04-25)

### 🩹 Fixes

- 离线时跳过 idle prefetch 清单预热 (a20393e2)

### 🔧 Chores

- 更新应用版本号至0.6.74并同步构建时间 (19cecd26)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.74 (2026-04-24)

### 🚀 Features

- 添加UI交互埋点并优化剪贴板权限检测 (26ae1854)
- 为缓存失败的媒体添加下载提示角标 (a42ed0ff)

### 🩹 Fixes

- 修复离线 CDN 资源缓存回退 (b70ad2ae)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.73 (2026-04-24)

### 🩹 Fixes

- 修复版本更新条假升级与 SW 提交时序 (328468bf)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.72 (2026-04-24)

### 🩹 Fixes

- 确保更新安装时所有预缓存资源就绪后再提示升级 (a1833973)

### 🔧 Chores

- perf(sw): 优化空闲预取机制并移除调试日志 (cd0b738d)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.70 (2026-04-24)

### 🚀 Features

- 完善 GPT Image 兼容链路 (fafb3ae6)

### 🩹 Fixes

- 收口预缓存并补齐按需工具离线资源 (c511ba29)
- 接力完整离线补齐并清理 drawnix tsc (317291d8)
- 修正跨域静态资源离线缓存命中 (99054680)
- 修正按需资源预缓存与预热分组 (2dcd6928)
- 限制 app shell 仅匹配根壳页面 (3b8f28f1)
- 修复离线模式下懒加载模块资源未预热 (55eee6a2)
- 修复 GPT Image 适配器 readonly 元组类型不兼容和灵感图缺少 imageQuality 默认值 (9da7d380)

### 🔧 Chores

- 更新版本号至0.6.69并刷新构建时间 (52915fd2)
- bump version to 0.6.69 (c99a25ee)
- bump version to 0.6.68 (7e005fd2)
- bump version to 0.6.67 (ba280129)
- bump version to 0.6.66 (c4124d29)
- bump version to 0.6.65 (ebf074bc)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.6.68 (2026-04-24)

### 🩹 Fixes

- 修正跨域静态资源离线缓存命中 (5b2d6774)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.66 (2026-04-24)

### 🩹 Fixes

- 修正按需资源预缓存与预热分组 (ccb41849)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.65 (2026-04-24)

### 🩹 Fixes

- 限制 app shell 仅匹配根壳页面 (f78d33ee)
- 修复离线模式下懒加载模块资源未预热 (68d368fc)

### 🔧 Chores

- 更新版本号至0.6.64并修正回滚脚本参数顺序 (7e024607)
- docs: 添加CDN熔断与静态资源可用性问题的经验总结 (b46459a1)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.64 (2026-04-23)

### 🚀 Features

- 添加CDN恢复探测和详细日志记录 (7559e132)

### 🩹 Fixes

- 修复 LLM API Logger 的 IDB 连接关闭导致大模型调用失败 (f13d842a)
- HTML 缓存双 key 存储，导航请求直接命中 (2ee82aea)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.60 (2026-04-23)

### 🚀 Features

- 支持多供应商分组的模型健康状态显示 (f0eef23c)

### 🩹 Fixes

- 稳定 service worker 分阶段加载与版本提交协议 (8051cd18)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.59 (2026-04-23)

### 🩹 Fixes

- 增强错误上下文收集并修复资源错误跟踪 (b1825467)
- 修正 SW 静态资源版本命中与启动页提示 (497703c5)
- 统一 PostHog 版本上下文 (f10d11b8)
- 老用户沿用旧版壳并修正图层锁定失效路径 (6e88c9d4)
- 将 SW 升级切换改为整包 ready 后再接管 (12bdc930)
- 恢复 Gemini 图片模型的 generateContent 路由策略 (d70f9d72)

### 🔧 Chores

- bump version to 0.6.58 (91a0747b)
- bump version to 0.6.57 (be81f306)
- 更新应用版本至0.6.56并同步构建时间 (54253348)
- bump version to 0.6.56 (f75b4289)
- 更新版本号至0.6.55并刷新构建时间 (159f2ebf)
- bump version to 0.6.55 (43a6cdb5)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.6.57 (2026-04-23)

### 🩹 Fixes

- 老用户沿用旧版壳并修正图层锁定失效路径 (2aed8ef9)

### 🔧 Chores

- 更新应用版本至0.6.56并同步构建时间 (90210e78)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.56 (2026-04-23)

### 🩹 Fixes

- 将 SW 升级切换改为整包 ready 后再接管 (6c482936)

### 🔧 Chores

- 更新版本号至0.6.55并刷新构建时间 (7610ed5e)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.55 (2026-04-23)

### 🔧 Chores

- refactor(service-worker): 移除未使用的SW启动进度查询逻辑 (406f021f)
- docs: 沉淀旧入口与悬空 hash 资源经验 (150371c6)
- docs: 沉淀首屏 CDN 回退与加载自愈经验 (85ed2213)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.54 (2026-04-22)

### 🩹 Fixes

- 修正首屏资源 CDN 回退路径归一化 (2d3da03e)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.53 (2026-04-22)

### 🩹 Fixes

- 修正首屏 loading 与 CDN 优先加载链路 (1b898a46)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.46 (2026-04-22)

### 🩹 Fixes

- 关闭页面时兜底恢复画布快照 (99c67048)
- 前置首屏加载并修复素材库插入画布链路 (862b95ef)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.45 (2026-04-22)

### 🩹 Fixes

- 提前显示常驻工具图标 (0fb45300)
- 处理打开文件取消后的空返回 (c069814e)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.44 (2026-04-22)

### 🚀 Features

- 增强提示词优化器并修复画布输入框交互 (6cbbe5dc)

### 🩹 Fixes

- 收敛 PostHog error tracking 噪音并补齐运行时容错 (a0392a2f)

### 🔧 Chores

- docs: 补充多 CDN 加载与发布稳定性经验总结 (8d92b401)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.43 (2026-04-21)

### 🚀 Features

- add keyboard shortcuts during pen creation (141a8d35)
- 扩展 gpt-image-2 图片比例支持 (26436ce5)

### 🩹 Fixes

- 修复版本更新后懒加载 chunk 失效白屏 (de9e370f)

### 🔧 Chores

- bump version to 0.6.42 (03f28821)
- 更新版本号至0.6.41并修复错误处理 (a5c1e0a9)
- bump version to 0.6.41 (d8d36ff6)
- docs: 更新网站元数据、SEO配置与用户手册内容 (ff696ac3)
- refactor: 调整视频模型默认配置与选择器排序 (6308cfd5)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- SaulgoodMan-C <271131037+SaulgoodMan-C@users.noreply.github.com>
- gongchengtu <1817063960@qq.com>

## 0.6.42 (2026-04-21)

### 🔧 Chores

- 更新版本号至0.6.41并修复错误处理 (5d4b4758)
- refactor: 调整视频模型默认配置与选择器排序 (6d8397d0)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.41 (2026-04-21)

### 🩹 Fixes

- 修复版本更新后懒加载 chunk 失效白屏 (03bda70c)

### 🔧 Chores

- 补充 PostHog 埋点复盘并收紧模型解析保护 (cfdac73e)
- docs: 更新文档索引并补充PostHog监控与埋点改造复盘 (b0b685c6)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.40 (2026-04-21)

### 🚀 Features

- 增强AI生成任务追踪与模型排序 (dd462bae)

### 🔧 Chores

- Refine boot error handling and idle prefetch defaults (7049af8b)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.37 (2026-04-21)

### 🚀 Features

- 优化启动加载与延迟功能挂载 (85ce2b7b)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.36 (2026-04-20)

### 🔧 Chores

- Add HTML boot loading overlay (b0bf8db0)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.35 (2026-04-20)

### 🚀 Features

- 智能 CDN 优先加载与经验沉淀 (ef5f2b8a)

### 🩹 Fixes

- 修复版本记录类型定义和函数调用错误 (e6b944ec)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.34 (2026-04-20)

### 🩹 Fixes

- 跨域下载失败时回退打开链接 (71d4aa7e)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.33 (2026-04-20)

### 🚀 Features

- 阿米 增加提示词优化弹窗并沉淀经验文档 (2bff4974)

### 🩹 Fixes

- 阿米 恢复生成页视频重生默认参考图 (34427731)
- 阿米 补齐视频路由热修缺失导入 (9bd66dc8)
- 阿米 修正视频弹窗模型路由串供应商 (ac220fc9)
- 阿米 修正 MV 生成链路与风格选择 (cbb504e3)
- 修复任务结果为空时素材转换崩溃的问题 (526cd471)

### 🔧 Chores

- refactor: 阿米 收敛 workflow 共享内核 (b81d268d)
- refactor: 统一 hover tips 交互 (d5474e2b)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.32 (2026-04-18)

### 🚀 Features

- 支持资产嵌入的尺寸调整和工具图标优化 (7d05d56b)
- 统一视频展示为海报优先并支持降级播放 (a2ad5fd6)
- 对齐爆款视频与爆款MV生成页交互 (8864fac4)
- 支持镜头草稿保存和素材库视频插入 (c808c822)
- 串行化爆款视频批量生成 (df558f3e)
- 优化多图批量生成锚点的位置规划与任务匹配 (84461d2b)
- 拆分多图生成反馈为独立锚点 (21471bec)
- 引入生图锚点反馈初版框架 (99c1a521)

### 🩹 Fixes

- 完善素材选择与素材插入体验 (88c63210)
- 优化知识库素材加载与媒体预览释放 (626df4a9)
- 修复归档任务导致音频素材元数据丢失 (94968bb2)
- 修复生成页多项 Bug 并优化单镜头生成参数透传 (4732d060)
- 修正 tuzi 图片路由与 AI 生图弹窗标题 (ff9f7395)
- 优化图片生成锚点的占位与加载反馈 (20b71b12)

### 🔧 Chores

- bump version to 0.6.31 (a086b160)
- bump version to 0.6.30 (a3c31d78)
- bump version to 0.6.29 (0e197f24)
- refactor(mv-creator): 重构为 分析→脚本→生成 三步流程，对齐爆款视频生成 (9e61a023)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.6.31 (2026-04-17)

### 🚀 Features

- 统一视频展示为海报优先并支持降级播放 (4c7a1032)
- 对齐爆款视频与爆款MV生成页交互 (ccf3c7b6)
- 支持镜头草稿保存和素材库视频插入 (3fac4d35)
- 串行化爆款视频批量生成 (3288d5cf)
- improve markdown image resizing and placement (1becd9b0)
- 优化ppt导出 (939e04f3)

### 🩹 Fixes

- 修复归档任务导致音频素材元数据丢失 (2b4a450a)
- 修复生成页多项 Bug 并优化单镜头生成参数透传 (f698b70f)
- 修正 tuzi 图片路由与 AI 生图弹窗标题 (8362bf8a)

### 🔧 Chores

- bump version to 0.6.30 (970fdf7d)
- bump version to 0.6.29 (4f85263b)
- refactor(mv-creator): 重构为 分析→脚本→生成 三步流程，对齐爆款视频生成 (c9a3c42c)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- SaulgoodMan-C <271131037+SaulgoodMan-C@users.noreply.github.com>
- liangyufeng <l.yfeng@qq.com>

## 0.6.29 (2026-04-15)

### 🚀 Features

- 支持镜头草稿保存和素材库视频插入 (eb691775)
- 串行化爆款视频批量生成 (b5f2ca6d)

### 🔧 Chores

- 更新版本号至0.6.28并扩展素材类型定义 (6a41a24d)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.28 (2026-04-15)

### 🚀 Features

- 引入音频卡片自适应尺寸及多工具窗口支持 (92b47af9)
- 完善音频结果缓存并接入 MV 分镜任务 (b108089d)
- 爆款MV生成器增强 — 历史跳转、帧传递、音频驱动分镜 (c29f4a81)

### 🩹 Fixes

- 修复任务工作流同步幽灵日志刷屏 (492ca8bf)
- 区分 sw-debug llmapi 的音频与歌词生成 (7421d206)
- 补齐 sw-debug 的 llmapi JSON 结果展示 (4a411bc6)
- 修复 suno 多音频重复与时长错误 (093cdf54)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.27 (2026-04-15)

### 🚀 Features

- 基于 pricing endpoints 推断 provider bindings (1a161276)
- 统一爆款音乐续写与 infill 能力 (458375c0)
- 优化爆款音乐生成工具流程与体验 (ae2f0e12)
- 支持工具默认窗口行为并修复音乐任务卡片异常 (788cbe04)

### 🩹 Fixes

- 首屏异步预热价格并补全 LLM 原始响应日志 (4aa69578)
- 清理任务列表批量索引误渲染 0 (211cb525)
- 补齐 suno 续写所需 task_id (703812e4)
- 保留爆款音乐创作描述并上移错误提示 (f3dce84e)
- 优化音乐分析历史标题并隐藏续写入口 (cd9b213d)

### 🔧 Chores

- refactor: 统一 LLM 调用日志，所有大模型调用自动记录到 sw-debug LLM API 面板 (7313b52f)
- style: 优化音乐分析器已生成片段布局 (616b4633)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.26 (2026-04-14)

### 🚀 Features

- 新增爆款音乐生成工具 (9e5bd769)
- 历史关联任务展开、生成回填、风格传递与脚本版本优化 (d914bc12)
- 支持工具弹窗多窗口实例 (247a9ff2)
- 脚本版本管理，支持多版本切换 (790e8272)
- 优化视频分析与脚本改编交互 (bc82abc6)
- 视频分析任务接入队列并优化结果插入 (0cfcb25c)
- 上传视频分析后自动提取首帧图片 (c50dec54)

### 🩹 Fixes

- 修复音乐分析器兼容性并完善工作流展示 (6cde07e0)
- 统一持久化删除的二次确认 (c717d30f)
- 统一确认弹窗与媒体预览提示词交互 (4b007267)
- 批量生成使用每个镜头独立的 batchId (f593eef3)
- 修复 Markdown 卡片初始化阶段的 Milkdown editorView 异常 (8badb0c7)
- 在爆款视频分析页提示 gemini-mix 分组 (55815a81)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.25 (2026-04-14)

### 🩹 Fixes

- 修正视频分析中内联数据的MIME类型 (55e6b903)
- 防止生成任务重复调用大模型 API (f381d800)
- 统一主应用和 sw-debug 的备份恢复核心逻辑 (3c359631)

### 🔧 Chores

- 更新应用版本并移除AI视频调试代码 (9628c9ad)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.24 (2026-04-13)

### 🩹 Fixes

- 收口 AI 视频弹窗受控模型同步环 (6c1b074e)
- 移除视频尺寸 Select 以绕开 TDesign Option 更新环 (40d2a72c)
- 补充 AI 视频弹窗调试标记并稳定图片标签依赖 (33d9420e)

### 🔧 Chores

- 补充 AI 视频弹窗关键状态链路调试日志 (316e3555)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.23 (2026-04-13)

### 🩹 Fixes

- 收口 iframe 下 AI 视频弹窗的剩余更新环 (58bfc2a0)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.22 (2026-04-13)

### 🩹 Fixes

- 收口 AI 视频弹窗参数回写循环 (6baf3e06)

### 🔧 Chores

- 更新应用版本至0.6.21并刷新构建时间 (252a203b)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.21 (2026-04-13)

### 🚀 Features

- 知识库素材嵌入 — Milkdown 自定义节点插件 (fec0e2a9)

### 🩹 Fixes

- 修复媒体库弹窗条件渲染和音频封面URL处理 (d13e108b)
- 收口关闭态工具箱与素材库弹窗挂载，修复用户页 Hook 崩溃 (45bfddb3)
- iframe 环境下打开 AI 图片生成弹窗 Maximum update depth exceeded (8c5a11fc)
- 避免 Milkdown 在 editorView 缺失时读取 markdown (0d04c261)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.20 (2026-04-13)

### 🚀 Features

- 模型测试性价比评分 + 选择器收藏/淘汰标记 (e3b694ac)

### 🩹 Fixes

- 统一音频下载封面写入逻辑 (97ab456a)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.19 (2026-04-12)

### 🚀 Features

- 增强错误处理与iframe测试支持 (f4682ff8)
- 音乐播放器支持知识库语音快捷操作 (e53e6846)
- 右键菜单动态展示模型描述和文档链接 (563376e1)
- 集成供应商模型价格信息展示 (8c011dbd)
- 优化画布 Markdown 卡片与知识库联动 (c04b9efd)
- 增加内置模型推荐分并统一排序 (bb65488e)
- 多选框增加全选/清除，修复测试本组模型数不一致 (2ede78a7)
- 更新默认模型至 Gemini 3.1 Pro Preview 并改进模型基准测试 (3cce05df)
- 模型测试历史会话增加搜索与模态筛选 (522b6c5d)

### 🩹 Fixes

- 防白屏 — 全局错误边界 + 统一错误恢复 UI + 日志导出 (6be795c9)
- 统一播放器速率控制并隔离播放缓存音频 (5334ca60)
- 收敛 AI 媒体缓存语义与远程缓存去重 (a35370f8)
- 补齐任务队列归档提示与历史数量 (e8fb08d7)
- override TDesign Tooltip default max-width to display larger video (1c9c73c5)
- 修复GitHub同步上下文未提供时的错误处理 (eaf6a41d)

### 🔧 Chores

- style: 提升右键菜单 disabled 项可读性 (91add984)
- style: fix config dashboard layout responsiveness in narrow container (cf92bb0f)
- style: optimize model benchmark layout for smaller screens (b5e36a01)
- style: increase API Key tooltip width for better video visibility (6688fb4c)
- style: optimize settings layout and model selection UI (b99baa5b)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.18 (2026-04-11)

### 🚀 Features

- 历史版本路径支持 + 未知元素类型容错 (48a78cd4)
- 优化模型批测入口与模型结果导出 (358e44ae)
- 生成步骤交互优化 + 字段精简 (c576d987)
- refine model benchmark batch selection (e18ff27e)
- add model benchmark workbench (d7b695b6)
- 视频上传预览 + 生成页重新分析 + UI 优化 (5323a31d)
- 脚本表单优化 + 生成链路增强 (79ec5d77)
- 长视频分段拼接全套优化 (002dc30d)
- AI 文本生成结果统一以 Markdown Card 方式插入画布 (c97fca2a)
- 新增视频分析工具 + 重构 MCP 队列逻辑为公共模块 (ac0f7331)

### 🩹 Fixes

- 补齐推荐模型选择与默认分组去重 (1a496766)
- 收敛模型测试弹窗启动与状态同步 (0529b331)
- 设置弹窗单模型测试带入当前模型 (9aa52c23)
- 修复设置弹窗激活后仍被测试弹窗遮挡 (99d0d0d4)
- 修复多窗口最新激活未置顶 (1f956f2d)
- ensure rawData is persisted and improve JSON display styling (2aa967af)
- 修复 generateContent 路由与超时问题 (7299a706)
- 收紧 API key 错误判定，避免误开设置面板 (21fffaa4)
- 修复 AI 文本插入为普通文本 + Card 换行丢失 + 选中带标题 (8479ac79)
- 修复模型搜索供应商展示与中文输入误选 (2412e404)
- 保留远程媒体原始 URL 语义 (8f9f828f)
- 深度用户页面加载内存溢出优化 (71a0dfe2)

### 🔧 Chores

- refactor(winbox): 统一窗口 z-index 管理，修复多窗口遮挡与测试弹窗状态问题 (6ec47b57)
- style(model-benchmark): comprehensive UI/UX beautification and functional refinement (2fe7bb15)
- docs: 补充 AI 文本插入必须传 label 走 Card 的编码规则 (69bce1a9)
- 添加搜索 (fe650d69)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.17 (2026-04-09)

### 🚀 Features

- 优化音乐播放器布局与队列体验 (4a76a43d)
- 统一音乐播放器，始终显示播放列表标签栏，新增"全部语音"标签 (a66e6d81)
- 增加 TTS 播报设置入口 (bd77e254)
- add canvas text read-aloud (63c30e48)
- route audio entries into music player playback (e8b9c4ff)
- 增加音频播放列表与收藏能力 (f8179794)
- 素材库支持音频展示、缓存与拖拽插入 (8c5a7e51)

### 🩹 Fixes

- 保持画布朗读在播放器切换时不中断 (13b98cca)
- 音乐播放器时间展示回退\n\n问题描述：音乐播放器列表在拿不到音频时长时展示 --:--，无法向用户提供有效时间信息。\n修复思路：新增统一时间副标题格式化，优先展示解析/已有时长，缺失时回退展示素材生成时间。\n更新代码架构：在 MusicPlayerTool 收敛音频时间展示策略，并为素材列表补充元数据时长解析链路。 (204da5a4)
- 修复音乐播放器最小化误触发底层播放控件\n\n问题描述:\n- 点击音乐播放器右上角最小化按钮时，事件会继续落到底层画布播放控件\n- 导致播放器最小化的同时误触发暂停/播放，交互结果与用户预期不一致\n\n修复思路:\n- 在最小化按钮上阻止 pointer/click 事件冒泡与默认行为\n- 使用 requestAnimationFrame 延后一帧执行最小化，避免同一点击链路被底层控件消费\n\n更新代码架构:\n- 收敛到音乐播放器工具内部按钮事件处理，不改播放服务与队列模型\n- 维持现有播放器/画布控件职责边界，仅修复 UI 事件穿透问题 (6ab178e1)
- 为无标题 markdown 卡片显示默认标题 (6f96cfec)
- markdown 元素按文本参与提示词 (32a17163)
- 保持 Agent 分类切模型不降级为文本 (2fbe82de)
- 优化设置弹窗小屏适配 (39eeb5ba)
- unify canvas audio queue playback (a0839a10)
- allow create menu on system playlist tabs (b4837565)
- unify playlist interactions and duration display (f61bf142)
- dedupe local canvas files and media library (ac6181d2)
- 过滤辅助缓存条目避免封面图显示为独立素材 (43bb958b)
- 修复本地拖入音频的标题和封面显示 (9e7776ba)
- 修复音频素材详情面板展示问题 (e4a545a4)
- 修复 Suno 参数下拉框不显示及版本默认值问题 (2b658c37)

### 🔧 Chores

- refactor: 调整知识库工具分类 (81e64fc8)
- refactor(context-menu): 统一右键菜单公共组件 (65739440)
- refactor: unify audio playlist tags (babb531a)
- refactor: unify audio track list and context menu (0f544aae)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.16 (2026-04-08)

### 🩹 Fixes

- 修复 Suno 默认动作与 release 卡死问题 (9d216539)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.15 (2026-04-08)

### 🚀 Features

- 优化播放器定位、高度、拖拽和垂直布局 (78038789)
- 完善音频预览与下载体验 (d3f5a1d5)
- sort models by freshness and persist model-scoped generation preferences (98ad2a06)
- add provider config shortcut (14901355)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.14 (2026-04-08)

### 🚀 Features

- 支持 Suno 歌词任务与厂商识别能力 (d3223043)
- 恢复被误删掉代码 (9166971c)
- 恢复被误删掉代码 (82134958)
- 优化代码 (4ebfdf60)
- 优化代码 (7f71ea6c)
- 新增模型 (d8cf2816)
- 优化导出 (ea50f410)
- 增加 Stitch 设计工作流资产与规范 (5d2c139b)
- 增加画布音频节点与播放能力 (6bf9d299)
- 接入音频生成任务与工作流链路 (9fe365ab)
- 增加音频模态与 Suno 路由基础 (d3d94f4c)
- 增加 Kling 参数适配 (539a2827)
- 增加 Kling 能力路由 (03f2fec2)
- 优化至形状可导出 (210c68b9)
- 优化至适配画笔 (a946b42f)
- 优化移动端设置与供应商配置体验 (868f1fee)
- 增强文本多模态识图与供应商模型路由体验 (ad47afef)
- 完善多供应商模型协议路由与 Sora 视频适配 (5c217bd2)
- 优化模型选择器供应商与厂商分层展示 (f43a9e4d)
- 优化设置页模型发现与配置体验 (868b0d45)
- 重构设置页并修复配置持久化 (f7962788)

### 🩹 Fixes

- persist dropdown selections and correct type fallback (1d868c5e)
- 修复 web 端音频任务类型检查失败 (74e80377)
- 优化音频节点内容布局与信息层级 (526cd0ce)
- 优化移动端音频播放器并恢复桌面端展示 (ab75d70a)
- 补充媒体任务兼容与路由回归 (e09750e1)
- 完善音频入口与任务展示体验 (10dc0abd)
- 优化 Kling 参数展示 (b7ad05d4)

### 🔧 Chores

- bump version to 0.6.13 (1a3d4deb)
- bump version to 0.6.12 (ecaf487e)
- checkpoint current local changes (fe2bdb7e)
- 优化弹窗 (16563720)
- featL：优化导出 (8e78c7ff)
- 实现多供应商模型配置与按模型来源路由 (979ff59d)
- 实现模型获取与按需添加流程 (7d5f9ab8)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>
- liangyufeng <l.yfeng@qq.com>

## 0.6.12 (2026-03-31)

### 🚀 Features

- 隐藏原生滚动条 (15e61dcb)
- 重建多供应商模型路由与移动端配置体验 (78de2528)

### 🩹 Fixes

- 修复多供应商分支构建类型错误 (541000cc)
- 修复缩略图地址钩子语法错误 (c8883799)
- update app version to 0.6.11 and adjust build time (8d8ad46a)

### ❤️  Thank You

- liangyufeng <l.yfeng@qq.com>
- gongchengtu <1817063960@qq.com>
- liquid <ljquan@qq.com>

## 0.6.11 (2026-03-18)

### 🔧 Chores

- 更新应用版本至0.6.10并修正调整大小句柄常量 (4bf18818)
- fixed: 兼容base64图片返回 (94d4a81c)
- fixed:修复部署失败 (9ecdebcc)
- fixed:修复素材库删除的bug (6ac4bf95)
- fixed:修复素材库删除的bug (c93d449e)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liangyufeng <l.yfeng@qq.com>

## 0.6.10 (2026-03-16)

### 🚀 Features

- 修改部署失败的问题 (23533dd2)
- 添加导出ppt的功能 (08e4fd52)
- 持久化 AI 生成参数偏好 (dbf42e78)
- 添加页面刷新后视频任务恢复和工作流同步机制 (8daecd7b)
- 优化画布上插入内容让其可滚动 (76024c85)
- 优化agent回答文本框 (d706c6ed)
- 优化知识库对话ai回答内容将其渲染为对应的markdown格式&优化skill生成的内容让外层文本框高度自适应内容高度 (cb76e4df)

### 🩹 Fixes

- 修复切换画板时刷新页面丢失当前画板的问题 (c164a1dc)

### 🔧 Chores

- 更新构建时间戳 (431af243)
- feat：优化文本框高度 (435cc865)

### ❤️  Thank You

- liangyufeng <l.yfeng@qq.com>
- gongchengtu <1817063960@qq.com>
- liquid <ljquan@qq.com>

## 0.6.9 (2026-03-08)

### 🚀 Features

- 添加页面刷新后恢复视频任务轮询的功能 (d434c165)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.6.8 (2026-03-07)

### 🚀 Features

- add backup restoration functionality with automatic chunking support (7d76899a)
- 支持剪贴板图片粘贴 (367830ca)
- 优化缩放累计误差 (f5330602)
- 优化多行输入取消聚焦会换行的问题 (4ab79120)
- 新增插入画布开关 (60f6c041)
- 优化 (1630ecbf)

### 🩹 Fixes

- 修复批量生图模型尺寸失效 (eee26c35)
- 仅为 gemini-3.1-flash-image-preview 开放新增比例并按模型过滤尺寸选项 (4b3600d7)
- update app version to 0.6.7 and adjust build time in version.json; refactor WeakRef usage in tracking.types.ts (ad9d7769)

### 🔧 Chores

- feat：优化缩放文本框&实现点击输入 (4ac4244e)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>
- liangyufeng <l.yfeng@qq.com>

## 0.6.7 (2026-03-04)

### 🚀 Features

- 添加图层 (74fc6e51)
- 优化Service Worker激活和CDN策略 (e8ec6272)
- 引入baoyu-skill (5b04670b)

### 🔧 Chores

- 更新版本至0.6.6并调整CDN优先级 (21a5d6ff)
- bump version to 0.6.6 (95f54096)
- bump version to 0.6.5 (c8c22e00)
- bump version to 0.6.4 (42f24424)
- bump version to 0.6.3 (28217b94)
- refactor: replace video with tutorial link in settings dialog and auth components (94675952)
- 优化 (60a5d1d4)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liangyufeng <l.yfeng@qq.com>
- liquidliang <ljquan@qq.com>

## 0.6.6 (2026-02-28)

### 🔧 Chores

- bump version to 0.6.5 (c8c22e00)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.6.5 (2026-02-28)

### 🚀 Features

- 优化Service Worker激活和CDN策略 (e8ec6272)

### 🔧 Chores

- bump version to 0.6.4 (42f24424)
- 优化 (60a5d1d4)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.6.4 (2026-02-28)

### 🚀 Features

- 优化Service Worker激活和CDN策略 (e8ec6272)
- 引入baoyu-skill (5b04670b)

### 🩹 Fixes

- 修复 GitHub Actions CI 配置以支持 pnpm (582b46cc)

### 🔧 Chores

- bump version to 0.6.3 (28217b94)
- 多文件禁用缓存确保版本与日志数据实时更新 (099d8807)
- 升级版本至0.6.2并更新构建时间与版本信息 (f3b13616)
- 优化 (60a5d1d4)
- refactor: 模型命名重构与功能增强 (1bd8048a)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.6.3 (2026-02-28)

### 🚀 Features

- 引入baoyu-skill (5b04670b)
- 重构版本相关菜单与页面，优化样式与交互体验 (e40635b9)
- 升级版本至0.6.1，优化部署与生成流程，集成多模型适配器 (784c58a8)

### 🩹 Fixes

- 修复 GitHub Actions CI 配置以支持 pnpm (582b46cc)

### 🔧 Chores

- 多文件禁用缓存确保版本与日志数据实时更新 (099d8807)
- 升级版本至0.6.2并更新构建时间与版本信息 (f3b13616)
- bump version to 0.6.2 (499797ca)
- refactor: 模型命名重构与功能增强 (1bd8048a)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.6.2 (2026-02-27)

### 🚀 Features

- 重构版本相关菜单与页面，优化样式与交互体验 (e40635b9)
- 升级版本至0.6.1，优化部署与生成流程，集成多模型适配器 (784c58a8)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.6.1 (2026-02-26)

### 🚀 Features

- 为 ImageGenerationParams 新增 params 字段支持模型特定参数 (ac10ed55)
- 版本日志菜单 + CHANGELOG.md 自动同步到 changelog.json (51bb033e)
- 新增多个系统技能常量定义 (f30c3ab6)
- 支持双击卡片打开知识库并关联笔记 (8301bce3)
- 为卡片元素添加复制文本功能 (f1a06a9a)
- 实现 Markdown 粘贴和知识库集成的 Card 标签贴元素 (7b590d30)
- 统一系统与自定义Skill执行路径并支持角色扮演模式 (58204689)
- 新增Skill工作流DSL解析与知识库集成 (f0df843c)
- 新增知识提取与同步功能 (093dd25d)
- 完整支持多图生成结果的存储、展示与预览 (2e5df25b)
- 集成 Seedream 5.0 并优化模型适配器匹配机制 (cc4232fd)
- 优化模型参数处理与自定义参数透传链路 (3eceb994)
- 集成即梦（Seedream + Seedance）模型，修复自定义参数透传链路 (31f857bb)
- 升级 (d8eb1502)
- 添加模型选择器厂商分类（VendorTabPanel 左右分栏布局） (55a18a84)
- 添加 Flux 图片生成适配器，重构 adapter 路由与回调传递 (f6b1670e)
- 集成 Milkdown Markdown 编辑器并优化幻灯片播放 (9e66bf4c)
- 接入 Midjourney 图片模型适配 (62266a31)
- 接入Kling视频模型适配 (a9c0eade)

### 🩹 Fixes

- 修复视频时长解析空值NaN并同步版本与更新说明 (e1e4137c)
- 移除视频创作技能 (33fe21bc)
- 修复卡片标题重复显示和交互事件问题 (f7409839)
- 修复删除上传图片后 hover 预览大图未消失的问题 (f9e3ee4f)
- 修复 Seedream 5.0 lite 模型 ID、3K 比例参数及底部输入栏参数丢失问题 (98912c16)
- 修复上下文菜单z-index硬编码问题 (3373b168)
- 提高上下文菜单的z-index以解决遮挡问题 (853f7868)
- 修复外部签名 URL 的 CORS 和参数破坏问题 (e0491e50)
- 修复签名 URL（TOS）因 Referer 校验导致缩略图/插入/下载 403 (262eea92)

### 🔧 Chores

- update build artifacts for version 0.5.95 (ef974603)
- bump version to 0.5.95 (1a7a018f)
- refactor(web): 优化类型定义和构建配置 refactor(sw): 增强类型安全处理 refactor(dawnix): 完善类型导入和配置 (84285d9e)
- docs: 新增知识库、命令面板和任务队列文档并更新相关内容 (4b3aedf8)
- docs(settings): 在API Key说明中添加演示视频链接 (d4e24da5)
- refactor(knowledge-base): 统一默认目录并简化目录类型映射 (bf7a367d)
- docs: 更新 CLAUDE.md 反映多模型适配器架构 (4bbebd99)
- Fix seedream adapter routing and dropdown layout (f4bb5a74)
- fixed:修复ppt新加的内容在上方的问题 (f4e345f7)
- 知识库 (5b8f2bdb)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>
- liangyufeng <l.yfeng@qq.com>
- liquid <ljquan@qq.com>

## 0.5.95 (2026-02-12)

### 🚀 Features

- 完整支持多图生成结果的存储、展示与预览 (2e5df25b)
- 集成 Seedream 5.0 并优化模型适配器匹配机制 (cc4232fd)
- 优化模型参数处理与自定义参数透传链路 (3eceb994)
- 集成即梦（Seedream + Seedance）模型，修复自定义参数透传链路 (31f857bb)
- 升级 (d8eb1502)
- 优化PPT相关能力 (7f592465)
- 添加模型选择器厂商分类（VendorTabPanel 左右分栏布局） (55a18a84)
- 添加 Flux 图片生成适配器，重构 adapter 路由与回调传递 (f6b1670e)
- 添加套索选择工具及工具栏/命令面板集成 (0d5e1d82)
- 添加 Frame 和幻灯片播放功能 (c9859671)
- implement new canvas features and command palette (47dfcf12)
- enhance logging and error handling in WorkflowEngine (5074339b)
- improve fallback engine handling and logging in workflow submission service (88a7199e)
- add batch clear failed tasks button in generation task list (e303baf8)
- enhance logging and error handling in AI analysis and agent execution (cc03ce1c)
- enhance session replay management and error handling (8a190371)
- improve Service Worker channel validation for streaming API calls (8f81e6ef)
- unify Service Worker availability checks and enforce main thread executor in fallback scenarios (e27d14e0)
- enhance workflow submission and error handling (3365fdfc)
- optimize analytics reporting and payload management (fef7bf06)
- add custom tools sync and prevent remote task resumption (f296875d)
- implement workflow handler initialization from IndexedDB (943419ec)
- enhance error handling and logging in Service Worker and task management (167a559a)
- implement video model adapters and enhance video generation (982313f3)
- enhance SW task queue service with fallback mechanisms and canvas operation handling (390bb155)
- add base64 image preview functionality (fba4fe7f)
- 接入 Midjourney 图片模型适配 (62266a31)
- implement image fitting utility and enhance video processing (25746d6b)
- enhance analytics and reporting functionality (30a9bbfd)
- enhance video handling and task queue management (4757a0d4)
- 接入Kling视频模型适配 (a9c0eade)
- add master badge and enhance Gist handling (1dc71a99)
- implement failed URL caching for external image requests (4376be0c)
- integrate fake-indexeddb and refactor media executor (dae0bb8a)
- implement unified media execution and workflow enhancements (900db04d)
- add Gist management panel and enhance sync logging (061423a9)
- implement soft delete and data recovery features (3a93bf08)
- 任务队列同步下载远程数据时双向合并 (27064a50)
- implement deletion sync with recycle bin (a36176ba)
- implement data encryption and synchronization enhancements (c0518af5)
- enhance thumbnail request handling with parameter prioritization (8b0b95bf)
- support opening tools via URL parameter and display tool icons in window title (9abfb3f3)
- enhance board ID management via URL parameters and improve user interaction (738f8b9b)
- 改进工作流恢复机制和错误处理 (d27939f8)
- move ai_analyze to SW and improve debug panel logging (50c94058)
- implement LLM API log selection and batch actions (070801ca)

### 🩹 Fixes

- 修复外部签名 URL 的 CORS 和参数破坏问题 (e0491e50)
- 修复签名 URL（TOS）因 Referer 校验导致缩略图/插入/下载 403 (262eea92)
- 修复tab 同步问题 (7c390191)
- 视频任务状态 (ea3c2ccc)
- update DelegatedOperation type usage in workflow submission service (ac40be77)
- guard video model config lookups (16473751)
- 降级模式图片/视频带参考图与 1MB 限制 (66db4935)
- 修复视频 API 请求格式错误 (0262697f)
- add missing apiKey to videoConfig in SW initialization (a1971c4e)
- enhance workflow submission with timeout and retry logic (84e9436c)
- enhance manifest decryption error handling (163bcee1)
- initialize session model from global settings (24ec69fa)

### 🔧 Chores

- bump version to 0.5.94 (4a96c339)
- bump version to 0.5.93 (3f6e583c)
- bump version to 0.5.92 (c32b257c)
- bump version to 0.5.91 (13442303)
- bump version to 0.5.90 (773cdb08)
- 更新应用版本至 0.5.89 (8ff11e56)
- bump version to 0.5.89 (85635880)
- update version to 0.5.88 and improve task storage handling (1adae49f)
- bump version to 0.5.88 (af685dde)
- bump version to 0.5.87 (de16ae04)
- bump version to 0.5.86 (2394021b)
- bump version to 0.5.85 (8e45567e)
- bump version to 0.5.84 (1aea9496)
- bump version to 0.5.83 (322118fb)
- bump version to 0.5.82 (692f0eff)
- update version to 0.5.82 and adjust build time (87a5198d)
- bump version to 0.5.81 (3ab8846d)
- update app version to 0.5.80 and adjust build time (dbdb729b)
- bump version to 0.5.80 (e8b67aee)
- bump version to 0.5.79 (b175bfaf)
- update postmessage-duplex dependency to version 1.2.0 (2bea89d7)
- enhance project configuration and task management (643e69fa)
- update app version to 0.5.78 and adjust styles for mobile badge display (afaf093b)
- bump version to 0.5.78 (b0f3df9e)
- update version to 0.5.77 and adjust build time (f11329fe)
- bump version to 0.5.77 (e158b459)
- bump version to 0.5.76 (22ef45ad)
- bump version to 0.5.75 (4a0e9128)
- update version to 0.5.74 and adjust build time (c7eb7979)
- bump version to 0.5.74 (1fc59675)
- update version to 0.5.73 and improve task loading logic (99b268e6)
- bump version to 0.5.73 (06a61e81)
- update version to 0.5.72 and enhance LLM API logging (3cdc13ea)
- bump version to 0.5.72 (df013d28)
- update app version to 0.5.71 and adjust build time (504fee1c)
- bump version to 0.5.71 (65d6716c)
- bump version to 0.5.70 (9847d773)
- update build time and refactor imports for consistency (036cce52)
- update app version to 0.5.69 and adjust build time in version.json (af1fb113)
- bump version to 0.5.69 (f51c14c0)
- bump version to 0.5.68 (49329c41)
- update app version to 0.5.67 and adjust build time (fedfebd4)
- bump version to 0.5.67 (70486b77)
- bump version to 0.5.66 (d0eafd68)
- clean up debug console logs and fix winbox icon handling (21a66663)
- update version and build time, refine toolbar styles, and ensure consistent type exports (4b3a7842)
- update app version to 0.5.64 and adjust build time (1772d5cd)
- bump version to 0.5.64 (c820a822)
- docs: 更新 CLAUDE.md 反映多模型适配器架构 (4bbebd99)
- Fix seedream adapter routing and dropdown layout (f4bb5a74)
- fixed:修复ppt新加的内容在上方的问题 (f4e345f7)
- ppt (98a60a56)
- fix：任务状态不同步 (8689c846)
- docs(claude): 添加新规则 - RxJS事件对象引用导致React.memo失效、API错误字段类型安全 (d553d884)
- docs(claude): 添加新规则 - 数值范围转换规则、列表索引ID追踪 (fbb91726)
- refactor: remove unused SW RPC methods and optimize communication (e36bbc76)
- docs(claude): 添加新规则 - 编程式选中元素需用 addSelectionWithTemporaryElements 触发渲染 (a2b0cd01)
- docs(claude): 添加新规则 - 自定义 Plait 组件 onContextChanged 必须处理 viewport 变化 (bfad96d5)
- docs(claude): 更新规则 - 全屏展示画布局部内容改用 viewport+隐藏UI+蒙层挖洞方案 (e09e0e80)
- docs(claude): 添加新规则 - 全屏展示画布局部内容用 toImage 截图独立渲染 (649c02bf)
- docs(claude): 添加新规则 - Plait Board Viewport 缩放+平移用 updateViewport 一步完成 (643cc38d)
- fixed:本次修改解决了ai生成图片中点击提示的下拉框手机端溢出问题&agent生成长方形图片容器溢出问题 (64c4da2d)
- docs(claude): 添加新规则 - 模块迁移接口完整性 (afb95640)
- docs: 添加编码规则 - 统计上报旁路化 (133b6a72)
- docs: update localhost port references from 4200 to 7200 (5a10c4c4)
- docs: 添加编码规则 - 配置同步到 IndexedDB 供 SW 读取 (db99fb6d)
- docs: 添加编码规则 - 枚举不能使用 import type 导入 (26360e85)
- 简化方案 (12525090)
- refactor: simplify architecture by removing DDD layers and unifying types (ad341a4f)
- docs: 添加配置对象深拷贝规则 (0002654a)
- perf: 优化同步上传性能，避免 UI 阻塞 (cbe11e08)
- docs: 添加 LLM API 日志记录异步任务 remoteId 规则 (708131f7)
- docs: 添加编码规则 - SW 初始化统一入口 (f13f809a)
- docs: 添加编码规则 - 模块循环依赖处理 (e6a39db6)
- docs: 添加降级模式任务执行规则 (e0f459a6)
- refactor: 清理调试日志和未使用代码 (066eb12d)
- docs: 更新工具函数规则 - 添加新模块和避免不必要包装 (8dfcf4a3)
- docs: 添加编码规则 - 降级路径功能一致性 (5c86d02b)
- docs: 添加 LLM 响应格式兼容性和工作流状态同步规则 (3d844c42)
- docs: 添加编码规则 - IndexedDB 直接读取和 RPC 超时处理 (10f953f7)
- docs: 添加同步数据格式一致性规则 (ebb412d1)
- docs: 添加同步模块日志规范 (97332dc7)
- docs(claude): 添加新规则 - GitHub Gist API 批量上传大小限制 (4e2741c9)
- docs: 添加异步操作和事件订阅相关规则 (a95ddd20)
- docs: 添加 CSS 变量优先级和弹出菜单截断规则 (8ecc8e75)
- docs: 添加数据安全保护编码规则 (8a955248)
- docs: 添加 SW 任务持久化规则和敏感 ID 脱敏说明 (da0c37e1)
- refactor(task-queue): deduplicate completed tasks and improve preview handling (5a3b4a95)
- docs: 添加 SW 重发 Tool Request 延迟规则 (fbfd0f13)
- docs: 更新 postmessage-duplex 规则 (v1.1.0) (a91afda0)
- docs: 添加 postmessage-duplex 消息大小限制规则 (597181eb)
- docs: 添加 postmessage-duplex publish 模式规则 (cac87cf4)
- docs: 添加 postmessage-duplex 库使用规范 (cacf6b43)

### ❤️  Thank You

- gongchengtu <1817063960@qq.com>
- liangyufeng <l.yfeng@qq.com>
- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>

## 0.5.94 (2026-02-09)

### 🚀 Features

- 优化PPT相关能力 (7f592465)
- 添加套索选择工具及工具栏/命令面板集成 (0d5e1d82)
- 添加 Frame 和幻灯片播放功能 (c9859671)
- implement new canvas features and command palette (47dfcf12)
- enhance logging and error handling in WorkflowEngine (5074339b)
- improve fallback engine handling and logging in workflow submission service (88a7199e)
- add batch clear failed tasks button in generation task list (e303baf8)
- enhance logging and error handling in AI analysis and agent execution (cc03ce1c)
- enhance session replay management and error handling (8a190371)
- improve Service Worker channel validation for streaming API calls (8f81e6ef)
- unify Service Worker availability checks and enforce main thread executor in fallback scenarios (e27d14e0)
- enhance workflow submission and error handling (3365fdfc)
- optimize analytics reporting and payload management (fef7bf06)

### 🩹 Fixes

- 修复tab 同步问题 (7c390191)
- 视频任务状态 (ea3c2ccc)
- update DelegatedOperation type usage in workflow submission service (ac40be77)
- guard video model config lookups (16473751)
- 降级模式图片/视频带参考图与 1MB 限制 (66db4935)
- 修复视频 API 请求格式错误 (0262697f)

### 🔧 Chores

- bump version to 0.5.93 (3f6e583c)
- bump version to 0.5.92 (c32b257c)
- bump version to 0.5.91 (13442303)
- bump version to 0.5.90 (773cdb08)
- 更新应用版本至 0.5.89 (8ff11e56)
- bump version to 0.5.89 (85635880)
- update version to 0.5.88 and improve task storage handling (1adae49f)
- bump version to 0.5.88 (af685dde)
- bump version to 0.5.87 (de16ae04)
- bump version to 0.5.86 (2394021b)
- bump version to 0.5.85 (8e45567e)
- bump version to 0.5.84 (1aea9496)
- bump version to 0.5.83 (322118fb)
- bump version to 0.5.82 (692f0eff)
- update version to 0.5.82 and adjust build time (87a5198d)
- bump version to 0.5.81 (3ab8846d)
- update app version to 0.5.80 and adjust build time (dbdb729b)
- bump version to 0.5.80 (e8b67aee)
- bump version to 0.5.79 (b175bfaf)
- update postmessage-duplex dependency to version 1.2.0 (2bea89d7)
- enhance project configuration and task management (643e69fa)
- update app version to 0.5.78 and adjust styles for mobile badge display (afaf093b)
- ppt (98a60a56)
- fix：任务状态不同步 (8689c846)
- docs(claude): 添加新规则 - RxJS事件对象引用导致React.memo失效、API错误字段类型安全 (d553d884)
- docs(claude): 添加新规则 - 数值范围转换规则、列表索引ID追踪 (fbb91726)
- refactor: remove unused SW RPC methods and optimize communication (e36bbc76)
- docs(claude): 添加新规则 - 编程式选中元素需用 addSelectionWithTemporaryElements 触发渲染 (a2b0cd01)
- docs(claude): 添加新规则 - 自定义 Plait 组件 onContextChanged 必须处理 viewport 变化 (bfad96d5)
- docs(claude): 更新规则 - 全屏展示画布局部内容改用 viewport+隐藏UI+蒙层挖洞方案 (e09e0e80)
- docs(claude): 添加新规则 - 全屏展示画布局部内容用 toImage 截图独立渲染 (649c02bf)
- docs(claude): 添加新规则 - Plait Board Viewport 缩放+平移用 updateViewport 一步完成 (643cc38d)
- fixed:本次修改解决了ai生成图片中点击提示的下拉框手机端溢出问题&agent生成长方形图片容器溢出问题 (64c4da2d)
- docs(claude): 添加新规则 - 模块迁移接口完整性 (afb95640)
- docs: 添加编码规则 - 统计上报旁路化 (133b6a72)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>
- liangyufeng <l.yfeng@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.5.91 (2026-02-08)

### 🩹 Fixes

- 视频任务状态 (ea3c2ccc)

### 🔧 Chores

- docs(claude): 添加新规则 - 数值范围转换规则、列表索引ID追踪 (fbb91726)
- refactor: remove unused SW RPC methods and optimize communication (e36bbc76)
- fixed:本次修改解决了ai生成图片中点击提示的下拉框手机端溢出问题&agent生成长方形图片容器溢出问题 (64c4da2d)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liangyufeng <l.yfeng@qq.com>

## 0.5.90 (2026-02-08)

### 🚀 Features

- 添加套索选择工具及工具栏/命令面板集成 (0d5e1d82)

### 🔧 Chores

- 更新应用版本至 0.5.89 (8ff11e56)
- docs(claude): 添加新规则 - 编程式选中元素需用 addSelectionWithTemporaryElements 触发渲染 (a2b0cd01)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.5.89 (2026-02-08)

### 🚀 Features

- 添加 Frame 和幻灯片播放功能 (c9859671)
- implement new canvas features and command palette (47dfcf12)

### 🔧 Chores

- update version to 0.5.88 and improve task storage handling (1adae49f)
- docs(claude): 添加新规则 - 自定义 Plait 组件 onContextChanged 必须处理 viewport 变化 (bfad96d5)
- docs(claude): 更新规则 - 全屏展示画布局部内容改用 viewport+隐藏UI+蒙层挖洞方案 (e09e0e80)
- docs(claude): 添加新规则 - 全屏展示画布局部内容用 toImage 截图独立渲染 (649c02bf)
- docs(claude): 添加新规则 - Plait Board Viewport 缩放+平移用 updateViewport 一步完成 (643cc38d)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.5.87 (2026-02-07)

### 🚀 Features

- enhance logging and error handling in WorkflowEngine (5074339b)

### 🔧 Chores

- bump version to 0.5.86 (2394021b)
- bump version to 0.5.85 (8e45567e)
- bump version to 0.5.84 (1aea9496)
- docs(claude): 添加新规则 - 模块迁移接口完整性 (afb95640)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liquidliang <ljquan@qq.com>

## 0.5.86 (2026-02-07)

### 🚀 Features

- improve fallback engine handling and logging in workflow submission service (88a7199e)

### 🩹 Fixes

- update DelegatedOperation type usage in workflow submission service (ac40be77)

### 🔧 Chores

- bump version to 0.5.85 (694d1ca6)
- bump version to 0.5.84 (9e307468)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liquidliang <ljquan@qq.com>

## 0.5.85 (2026-02-07)

### 🚀 Features

- add batch clear failed tasks button in generation task list (e303baf8)

### 🩹 Fixes

- guard video model config lookups (16473751)
- 修复视频 API 请求格式错误 (0262697f)

### 🔧 Chores

- bump version to 0.5.84 (fd194ee7)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liangyufeng <l.yfeng@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.5.84 (2026-02-07)

### 🔧 Chores

- update version to 0.5.82 and adjust build time (87a5198d)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.5.83 (2026-02-07)

### 🚀 Features

- enhance logging and error handling in AI analysis and agent execution (cc03ce1c)

### 🔧 Chores

- bump version to 0.5.82 (692f0eff)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liquidliang <ljquan@qq.com>

## 0.5.82 (2026-02-07)

### 🚀 Features

- enhance session replay management and error handling (8a190371)
- improve Service Worker channel validation for streaming API calls (8f81e6ef)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liquidliang <ljquan@qq.com>

## 0.5.81 (2026-02-07)

### 🚀 Features

- unify Service Worker availability checks and enforce main thread executor in fallback scenarios (e27d14e0)
- enhance workflow submission and error handling (3365fdfc)

### 🔧 Chores

- update app version to 0.5.80 and adjust build time (dbdb729b)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>

## 0.5.79 (2026-02-06)

### 🚀 Features

- optimize analytics reporting and payload management (fef7bf06)
- add custom tools sync and prevent remote task resumption (f296875d)
- implement workflow handler initialization from IndexedDB (943419ec)
- enhance error handling and logging in Service Worker and task management (167a559a)
- implement video model adapters and enhance video generation (982313f3)
- enhance SW task queue service with fallback mechanisms and canvas operation handling (390bb155)
- add base64 image preview functionality (fba4fe7f)
- implement image fitting utility and enhance video processing (25746d6b)

### 🩹 Fixes

- 降级模式图片/视频带参考图与 1MB 限制 (66db4935)
- add missing apiKey to videoConfig in SW initialization (a1971c4e)

### 🔧 Chores

- update postmessage-duplex dependency to version 1.2.0 (2bea89d7)
- enhance project configuration and task management (643e69fa)
- update app version to 0.5.78 and adjust styles for mobile badge display (afaf093b)
- bump version to 0.5.78 (b0f3df9e)
- update version to 0.5.77 and adjust build time (f11329fe)
- bump version to 0.5.77 (e158b459)
- bump version to 0.5.76 (22ef45ad)
- bump version to 0.5.75 (4a0e9128)
- update version to 0.5.74 and adjust build time (c7eb7979)
- bump version to 0.5.74 (1fc59675)
- update version to 0.5.73 and improve task loading logic (99b268e6)
- bump version to 0.5.73 (06a61e81)
- update version to 0.5.72 and enhance LLM API logging (3cdc13ea)
- bump version to 0.5.72 (df013d28)
- update app version to 0.5.71 and adjust build time (504fee1c)
- docs: 添加编码规则 - 统计上报旁路化 (133b6a72)
- docs: update localhost port references from 4200 to 7200 (5a10c4c4)
- docs: 添加编码规则 - 配置同步到 IndexedDB 供 SW 读取 (db99fb6d)
- docs: 添加编码规则 - 枚举不能使用 import type 导入 (26360e85)
- 简化方案 (12525090)
- refactor: simplify architecture by removing DDD layers and unifying types (ad341a4f)
- docs: 添加配置对象深拷贝规则 (0002654a)
- perf: 优化同步上传性能，避免 UI 阻塞 (cbe11e08)
- docs: 添加 LLM API 日志记录异步任务 remoteId 规则 (708131f7)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liquidliang <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.5.78 (2026-02-06)

### 🚀 Features

- add custom tools sync and prevent remote task resumption (f296875)
- implement workflow handler initialization from IndexedDB (943419e)
- enhance error handling and logging in Service Worker and task management (167a559)
- implement video model adapters and enhance video generation (982313f)
- enhance SW task queue service with fallback mechanisms and canvas operation handling (390bb15)
- add base64 image preview functionality (fba4fe7)

### 🩹 Fixes

- add missing apiKey to videoConfig in SW initialization (a1971c4)

### 🔧 Chores

- update version to 0.5.77 and adjust build time (f11329f)
- bump version to 0.5.77 (e158b45)
- bump version to 0.5.76 (22ef45a)
- bump version to 0.5.75 (4a0e912)
- update version to 0.5.74 and adjust build time (c7eb797)
- docs: update localhost port references from 4200 to 7200 (5a10c4c)
- docs: 添加编码规则 - 配置同步到 IndexedDB 供 SW 读取 (db99fb6)
- docs: 添加编码规则 - 枚举不能使用 import type 导入 (26360e8)
- 简化方案 (1252509)
- refactor: simplify architecture by removing DDD layers and unifying types (ad341a4)
- docs: 添加配置对象深拷贝规则 (0002654)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>
- liquidliang <ljquan@qq.com>

## 0.5.76 (2026-02-05)

### 🚀 Features

- add base64 image preview functionality (fba4fe7)

### 🔧 Chores

- docs: 添加配置对象深拷贝规则 (0002654)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.5.75 (2026-02-05)

### 🚀 Features

- implement image fitting utility and enhance video processing (25746d6)
- enhance analytics and reporting functionality (30a9bbf)
- enhance video handling and task queue management (4757a0d)
- add master badge and enhance Gist handling (1dc71a9)
- implement failed URL caching for external image requests (4376be0)
- integrate fake-indexeddb and refactor media executor (dae0bb8)
- implement unified media execution and workflow enhancements (900db04)
- add Gist management panel and enhance sync logging (061423a)
- implement soft delete and data recovery features (3a93bf0)
- 任务队列同步下载远程数据时双向合并 (27064a5)
- implement deletion sync with recycle bin (a36176b)
- implement data encryption and synchronization enhancements (c0518af)
- enhance thumbnail request handling with parameter prioritization (8b0b95b)
- support opening tools via URL parameter and display tool icons in window title (9abfb3f)
- enhance board ID management via URL parameters and improve user interaction (738f8b9)
- 改进工作流恢复机制和错误处理 (d27939f)
- move ai_analyze to SW and improve debug panel logging (50c9405)
- implement LLM API log selection and batch actions (070801c)

### 🩹 Fixes

- enhance workflow submission with timeout and retry logic (84e9436)
- enhance manifest decryption error handling (163bcee)
- initialize session model from global settings (24ec69f)

### 🔧 Chores

- update version to 0.5.74 and adjust build time (c7eb797)
- bump version to 0.5.74 (1fc5967)
- update version to 0.5.73 and improve task loading logic (99b268e)
- bump version to 0.5.73 (06a61e8)
- update version to 0.5.72 and enhance LLM API logging (3cdc13e)
- bump version to 0.5.72 (df013d2)
- update app version to 0.5.71 and adjust build time (504fee1)
- bump version to 0.5.71 (65d6716)
- bump version to 0.5.70 (9847d77)
- update build time and refactor imports for consistency (036cce5)
- update app version to 0.5.69 and adjust build time in version.json (af1fb11)
- bump version to 0.5.69 (f51c14c)
- bump version to 0.5.68 (49329c4)
- update app version to 0.5.67 and adjust build time (fedfebd)
- bump version to 0.5.67 (70486b7)
- bump version to 0.5.66 (d0eafd6)
- clean up debug console logs and fix winbox icon handling (21a6666)
- update version and build time, refine toolbar styles, and ensure consistent type exports (4b3a784)
- update app version to 0.5.64 and adjust build time (1772d5c)
- perf: 优化同步上传性能，避免 UI 阻塞 (cbe11e0)
- docs: 添加 LLM API 日志记录异步任务 remoteId 规则 (708131f)
- docs: 添加编码规则 - SW 初始化统一入口 (f13f809)
- docs: 添加编码规则 - 模块循环依赖处理 (e6a39db)
- docs: 添加降级模式任务执行规则 (e0f459a)
- refactor: 清理调试日志和未使用代码 (066eb12)
- docs: 更新工具函数规则 - 添加新模块和避免不必要包装 (8dfcf4a)
- docs: 添加编码规则 - 降级路径功能一致性 (5c86d02)
- docs: 添加 LLM 响应格式兼容性和工作流状态同步规则 (3d844c4)
- docs: 添加编码规则 - IndexedDB 直接读取和 RPC 超时处理 (10f953f)
- docs: 添加同步数据格式一致性规则 (ebb412d)
- docs: 添加同步模块日志规范 (97332dc)
- docs(claude): 添加新规则 - GitHub Gist API 批量上传大小限制 (4e2741c)
- docs: 添加异步操作和事件订阅相关规则 (a95ddd2)
- docs: 添加 CSS 变量优先级和弹出菜单截断规则 (8ecc8e7)
- docs: 添加数据安全保护编码规则 (8a95524)
- docs: 添加 SW 任务持久化规则和敏感 ID 脱敏说明 (da0c37e)
- refactor(task-queue): deduplicate completed tasks and improve preview handling (5a3b4a9)
- docs: 添加 SW 重发 Tool Request 延迟规则 (fbfd0f1)
- docs: 更新 postmessage-duplex 规则 (v1.1.0) (a91afda)
- docs: 添加 postmessage-duplex 消息大小限制规则 (597181e)
- docs: 添加 postmessage-duplex publish 模式规则 (cac87cf)
- docs: 添加 postmessage-duplex 库使用规范 (cacf6b4)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>

## 0.5.74 (2026-02-05)

### 🔧 Chores

- update version to 0.5.73 and improve task loading logic (99b268e)
- perf: 优化同步上传性能，避免 UI 阻塞 (cbe11e0)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.5.73 (2026-02-05)

### 🚀 Features

- implement image fitting utility and enhance video processing (25746d6)

### 🔧 Chores

- update version to 0.5.72 and enhance LLM API logging (3cdc13e)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.5.72 (2026-02-05)

### 🚀 Features

- enhance analytics and reporting functionality (30a9bbf)
- enhance video handling and task queue management (4757a0d)
- add master badge and enhance Gist handling (1dc71a9)
- implement failed URL caching for external image requests (4376be0)

### 🔧 Chores

- update app version to 0.5.71 and adjust build time (504fee1)
- bump version to 0.5.71 (65d6716)
- docs: 添加 LLM API 日志记录异步任务 remoteId 规则 (708131f)
- docs: 添加编码规则 - SW 初始化统一入口 (f13f809)
- docs: 添加编码规则 - 模块循环依赖处理 (e6a39db)
- docs: 添加降级模式任务执行规则 (e0f459a)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>

## 0.5.71 (2026-02-05)

### 🚀 Features

- enhance analytics and reporting functionality (30a9bbfd)
- enhance video handling and task queue management (4757a0d4)
- add master badge and enhance Gist handling (1dc71a99)
- implement failed URL caching for external image requests (4376be0c)
- integrate fake-indexeddb and refactor media executor (dae0bb8a)
- implement unified media execution and workflow enhancements (900db04d)
- add Gist management panel and enhance sync logging (061423a9)

### 🩹 Fixes

- enhance workflow submission with timeout and retry logic (84e9436c)

### 🔧 Chores

- bump version to 0.5.70 (9847d773)
- update build time and refactor imports for consistency (036cce52)
- update app version to 0.5.69 and adjust build time in version.json (af1fb113)
- bump version to 0.5.69 (f51c14c0)
- docs: 添加编码规则 - SW 初始化统一入口 (f13f809a)
- docs: 添加编码规则 - 模块循环依赖处理 (e6a39db6)
- docs: 添加降级模式任务执行规则 (e0f459a6)
- refactor: 清理调试日志和未使用代码 (066eb12d)
- docs: 更新工具函数规则 - 添加新模块和避免不必要包装 (8dfcf4a3)
- docs: 添加编码规则 - 降级路径功能一致性 (5c86d02b)
- docs: 添加 LLM 响应格式兼容性和工作流状态同步规则 (3d844c42)
- docs: 添加编码规则 - IndexedDB 直接读取和 RPC 超时处理 (10f953f7)
- docs: 添加同步数据格式一致性规则 (ebb412d1)
- docs: 添加同步模块日志规范 (97332dc7)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liquidliang <ljquan@qq.com>

## 0.5.70 (2026-02-04)

### 🚀 Features

- integrate fake-indexeddb and refactor media executor (dae0bb8)

### 🔧 Chores

- update build time and refactor imports for consistency (036cce5)
- update app version to 0.5.69 and adjust build time in version.json (af1fb11)
- refactor: 清理调试日志和未使用代码 (066eb12)
- docs: 更新工具函数规则 - 添加新模块和避免不必要包装 (8dfcf4a)
- docs: 添加编码规则 - 降级路径功能一致性 (5c86d02)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.5.69 (2026-02-04)

### 🚀 Features

- implement unified media execution and workflow enhancements (900db04)
- add Gist management panel and enhance sync logging (061423a)
- implement soft delete and data recovery features (3a93bf0)
- 任务队列同步下载远程数据时双向合并 (27064a5)
- implement deletion sync with recycle bin (a36176b)
- implement data encryption and synchronization enhancements (c0518af)
- enhance thumbnail request handling with parameter prioritization (8b0b95b)
- support opening tools via URL parameter and display tool icons in window title (9abfb3f)
- enhance board ID management via URL parameters and improve user interaction (738f8b9)
- 改进工作流恢复机制和错误处理 (d27939f)
- move ai_analyze to SW and improve debug panel logging (50c9405)
- implement LLM API log selection and batch actions (070801c)
- support async models with size and references (e85dda8)
- implement auto-compression for 10-25MB images (c26cbec)

### 🩹 Fixes

- enhance workflow submission with timeout and retry logic (84e9436)
- enhance manifest decryption error handling (163bcee)
- initialize session model from global settings (24ec69f)

### 🔧 Chores

- bump version to 0.5.68 (49329c4)
- update app version to 0.5.67 and adjust build time (fedfebd)
- bump version to 0.5.67 (70486b7)
- bump version to 0.5.66 (d0eafd6)
- clean up debug console logs and fix winbox icon handling (21a6666)
- update version and build time, refine toolbar styles, and ensure consistent type exports (4b3a784)
- update app version to 0.5.64 and adjust build time (1772d5c)
- bump version to 0.5.64 (c820a82)
- update release script and bump app version to 0.5.63 (8b36e88)
- docs: 添加 LLM 响应格式兼容性和工作流状态同步规则 (3d844c4)
- docs: 添加编码规则 - IndexedDB 直接读取和 RPC 超时处理 (10f953f)
- docs: 添加同步数据格式一致性规则 (ebb412d)
- docs: 添加同步模块日志规范 (97332dc)
- docs(claude): 添加新规则 - GitHub Gist API 批量上传大小限制 (4e2741c)
- docs: 添加异步操作和事件订阅相关规则 (a95ddd2)
- docs: 添加 CSS 变量优先级和弹出菜单截断规则 (8ecc8e7)
- docs: 添加数据安全保护编码规则 (8a95524)
- docs: 添加 SW 任务持久化规则和敏感 ID 脱敏说明 (da0c37e)
- refactor(task-queue): deduplicate completed tasks and improve preview handling (5a3b4a9)
- docs: 添加 SW 重发 Tool Request 延迟规则 (fbfd0f1)
- docs: 更新 postmessage-duplex 规则 (v1.1.0) (a91afda)
- docs: 添加 postmessage-duplex 消息大小限制规则 (597181e)
- docs: 添加 postmessage-duplex publish 模式规则 (cac87cf)
- docs: 添加 postmessage-duplex 库使用规范 (cacf6b4)
- refactor: rename project from Xingtu to Xingtu (a4ca6ca)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liquidliang <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>
- mengxiangtu <changesydneyai@gmail.com>

## 0.5.68 (2026-02-02)

### 🩹 Fixes

- enhance manifest decryption error handling (163bcee)

### 🔧 Chores

- update app version to 0.5.67 and adjust build time (fedfebd)
- docs(claude): 添加新规则 - GitHub Gist API 批量上传大小限制 (4e2741c)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>

## 0.5.67 (2026-02-02)

### 🚀 Features

- implement soft delete and data recovery features (3a93bf0)
- 任务队列同步下载远程数据时双向合并 (27064a5)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.5.64 (2026-01-30)

### 🚀 Features

- support async models with size and references (e85dda8)
- implement auto-compression for 10-25MB images (c26cbec)
- 添加"不再提示"按钮到灵感创意板块 (17b926a)
- 添加重命名验证功能，禁止同级重名 (a69c57a)
- 完成 AI 输入栏和 ChatDrawer 完整测试体系 (1c3fa39)
- 完成所有核心功能 Manual GIF 录制体系 (d60c4a4)

### 🔧 Chores

- update release script and bump app version to 0.5.63 (8b36e88)
- bump version to 0.5.63 (52f4493)
- update app version to 0.5.62 and adjust build time in version.json (147815c)
- bump version to 0.5.62 (15c42c6)
- update version to 0.5.61 and enhance batch processing logic in image and video generation (243725e)
- refactor: rename project from Xingtu to Xingtu (a4ca6ca)
- refactor: 迁移通用工具函数到 @aitu/utils 并消除二次导出 (0645497)
- docs: 添加工具函数组织规则 (6abdcad)
- Remove legacy workspace rename spec (a7063f4)
- Fix workspace item naming collisions (b8019f1)

### ❤️  Thank You

- gongchengtu <1817063960@qq.com>
- mengxiangtu <changesydneyai@gmail.com>
- liquidliang <ljquan@qq.com>
- zzz <zzz@zzzdeMac-mini.local>

## 0.5.63 (2026-01-29)

### 🚀 Features

- 添加"不再提示"按钮到灵感创意板块 (17b926a)

### 🔧 Chores

- update app version to 0.5.62 and adjust build time in version.json (147815c)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- zzz <zzz@zzzdeMac-mini.local>

## 0.5.62 (2026-01-29)

### 🚀 Features

- 添加重命名验证功能，禁止同级重名 (a69c57a)
- 完成 AI 输入栏和 ChatDrawer 完整测试体系 (1c3fa39)
- 完成所有核心功能 Manual GIF 录制体系 (d60c4a4)
- 移动端适配 (ade6470)
- 全面优化多端响应式适配 (1b06d2f)
- 统一媒体预览组件并优化缩略图展示 (a617211)
- enhance pencil and eraser settings with shape selection (cbde7b2)
- 增强文字属性面板样式设置功能 (2b437fa)
- add alignment, distribution, and boolean operation buttons (811111e)
- 对比模式下视频联动同步播放和重置 (ea9b932)
- enhance user manual generation and CDN integration (ba4746d)
- enhance user manual generation and E2E testing (607ec7e)
- 添加用户手册生成系统和 E2E 测试增强 (4daff77)
- 新增 TaskProgressOverlay 组件显示任务进度 (0ab1aa3)

### 🩹 Fixes

- 修复批量生成只执行第一个任务的问题 (ebca700)
- enhance task submission and execution checks (7a92d70)
- 使用 Context 共享健康状态数据修复显示不一致问题 (b95247a)

### 🔧 Chores

- update version to 0.5.61 and enhance batch processing logic in image and video generation (243725e)
- bump version to 0.5.61 (20feb2d)
- update version to 0.5.60 and improve board selection logic (3723135)
- bump version to 0.5.60 (9d64bc7)
- bump version to 0.5.59 (8b93fb2)
- remove batch-image.html from build and deploy configurations (7ef1c37)
- update deployment scripts and versioning logic; bump version to 0.5.58 (f7c1cde)
- bump version to 0.5.58 (80fb213)
- bump version to 0.5.57 (8aff14b)
- bump version to 0.5.56 (34917aa)
- bump version to 0.5.55 (41eb428)
- bump version to 0.5.54 (c5e23b0)
- bump version to 0.5.53 (c49a324)
- bump version to 0.5.52 (bc42ff4)
- bump version to 0.5.51 (78acdbf)
- bump version to 0.5.50 (c5db0c5)
- bump version to 0.5.49 (396f90c)
- update app version to 0.5.48 and adjust build time (b97371b)
- refactor: 迁移通用工具函数到 @aitu/utils 并消除二次导出 (0645497)
- docs: 添加工具函数组织规则 (6abdcad)
- Remove legacy workspace rename spec (a7063f4)
- Fix workspace item naming collisions (b8019f1)
- docs(claude): 添加新规则 - 工作区初始化自动选择画板 (c571cb7)
- refactor(task-queue): update resume methods to reuse original LLM API log entries (d96f066)
- 去掉参数n (989e919)
- docs: 添加 Slate-React Leaf DOM 结构稳定性规则 (a20c4a4)
- docs: 添加编码规则 - Clipper 布尔运算结果处理 (fe13ef8)
- docs: 添加编码规则 - useCallback 定义顺序 (6f891ea)
- docs(claude): 添加新规则 - 日志记录应反映实际发送的数据 (c714761)
- docs(claude): 添加新规则 - 多组件共享异步数据时使用 Context (c688c15)
- docs(claude): 添加新规则 - Props 变化时重置组件内部状态 (2011c2e)
- docs(claude): 添加新规则 - Flex布局兄弟元素隐藏导致宽度变化 (9a917ab)
- Update README.md (cf65ccf)
- Update README_en.md (aa6986d)
- docs(readme): align Chinese link (3d37033)
- docs(readme): fix english readme link (c58b01d)
- docs(readme): update demo links (4fd7ba4)
- 添加e2e (07e18e2)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>
- liquid <ljquan@qq.com>
- ovst <wangjueszu@qq.com>

## 0.5.61 (2026-01-27)

### 🚀 Features

- 移动端适配 (ade6470)
- 全面优化多端响应式适配 (1b06d2f)
- 统一媒体预览组件并优化缩略图展示 (a617211)
- enhance pencil and eraser settings with shape selection (cbde7b2)
- 增强文字属性面板样式设置功能 (2b437fa)
- add alignment, distribution, and boolean operation buttons (811111e)
- 对比模式下视频联动同步播放和重置 (ea9b932)
- enhance user manual generation and CDN integration (ba4746d)
- enhance user manual generation and E2E testing (607ec7e)
- 添加用户手册生成系统和 E2E 测试增强 (4daff77)
- 新增 TaskProgressOverlay 组件显示任务进度 (0ab1aa3)

### 🩹 Fixes

- 修复批量生成只执行第一个任务的问题 (ebca700)
- enhance task submission and execution checks (7a92d70)
- 使用 Context 共享健康状态数据修复显示不一致问题 (b95247a)

### 🔧 Chores

- update version to 0.5.60 and improve board selection logic (3723135)
- bump version to 0.5.60 (9d64bc7)
- bump version to 0.5.59 (8b93fb2)
- remove batch-image.html from build and deploy configurations (7ef1c37)
- update deployment scripts and versioning logic; bump version to 0.5.58 (f7c1cde)
- bump version to 0.5.58 (80fb213)
- bump version to 0.5.57 (8aff14b)
- bump version to 0.5.56 (34917aa)
- bump version to 0.5.55 (41eb428)
- bump version to 0.5.54 (c5e23b0)
- bump version to 0.5.53 (c49a324)
- bump version to 0.5.52 (bc42ff4)
- bump version to 0.5.51 (78acdbf)
- bump version to 0.5.50 (c5db0c5)
- bump version to 0.5.49 (396f90c)
- update app version to 0.5.48 and adjust build time (b97371b)
- docs(claude): 添加新规则 - 工作区初始化自动选择画板 (c571cb7)
- refactor(task-queue): update resume methods to reuse original LLM API log entries (d96f066)
- 去掉参数n (989e919)
- docs: 添加 Slate-React Leaf DOM 结构稳定性规则 (a20c4a4)
- docs: 添加编码规则 - Clipper 布尔运算结果处理 (fe13ef8)
- docs: 添加编码规则 - useCallback 定义顺序 (6f891ea)
- docs(claude): 添加新规则 - 日志记录应反映实际发送的数据 (c714761)
- docs(claude): 添加新规则 - 多组件共享异步数据时使用 Context (c688c15)
- docs(claude): 添加新规则 - Props 变化时重置组件内部状态 (2011c2e)
- docs(claude): 添加新规则 - Flex布局兄弟元素隐藏导致宽度变化 (9a917ab)
- Update README.md (cf65ccf)
- Update README_en.md (aa6986d)
- docs(readme): align Chinese link (3d37033)
- docs(readme): fix english readme link (c58b01d)
- docs(readme): update demo links (4fd7ba4)
- 添加e2e (07e18e2)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liquidliang <ljquan@qq.com>
- ovst <wangjueszu@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.5.60 (2026-01-26)

### 🔧 Chores

- docs(claude): 添加新规则 - 工作区初始化自动选择画板 (9bece83)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.5.59 (2026-01-26)

### 🚀 Features

- 移动端适配 (ade6470)

### 🔧 Chores

- update deployment scripts and versioning logic; bump version to 0.5.58 (f7c1cde)
- bump version to 0.5.58 (80fb213)
- bump version to 0.5.57 (8aff14b)
- bump version to 0.5.56 (34917aa)
- bump version to 0.5.55 (41eb428)
- bump version to 0.5.54 (c5e23b0)
- bump version to 0.5.53 (c49a324)
- bump version to 0.5.52 (bc42ff4)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.5.52 (2026-01-26)

### 🚀 Features

- 移动端适配 (ade6470)
- 全面优化多端响应式适配 (1b06d2f)
- 统一媒体预览组件并优化缩略图展示 (a617211)
- enhance pencil and eraser settings with shape selection (cbde7b2)
- 增强文字属性面板样式设置功能 (2b437fa)
- add alignment, distribution, and boolean operation buttons (811111e)
- 对比模式下视频联动同步播放和重置 (ea9b932)
- enhance user manual generation and CDN integration (ba4746d)
- enhance user manual generation and E2E testing (607ec7e)
- 添加用户手册生成系统和 E2E 测试增强 (4daff77)
- 新增 TaskProgressOverlay 组件显示任务进度 (0ab1aa3)

### 🩹 Fixes

- 修复批量生成只执行第一个任务的问题 (ebca700)
- enhance task submission and execution checks (7a92d70)
- 使用 Context 共享健康状态数据修复显示不一致问题 (b95247a)

### 🔧 Chores

- bump version to 0.5.51 (78acdbf)
- bump version to 0.5.50 (c5db0c5)
- bump version to 0.5.49 (396f90c)
- update app version to 0.5.48 and adjust build time (b97371b)
- refactor(task-queue): update resume methods to reuse original LLM API log entries (d96f066)
- 去掉参数n (989e919)
- docs: 添加 Slate-React Leaf DOM 结构稳定性规则 (a20c4a4)
- docs: 添加编码规则 - Clipper 布尔运算结果处理 (fe13ef8)
- docs: 添加编码规则 - useCallback 定义顺序 (6f891ea)
- docs(claude): 添加新规则 - 日志记录应反映实际发送的数据 (c714761)
- docs(claude): 添加新规则 - 多组件共享异步数据时使用 Context (c688c15)
- docs(claude): 添加新规则 - Props 变化时重置组件内部状态 (2011c2e)
- docs(claude): 添加新规则 - Flex布局兄弟元素隐藏导致宽度变化 (9a917ab)
- Update README.md (cf65ccf)
- Update README_en.md (aa6986d)
- docs(readme): align Chinese link (3d37033)
- docs(readme): fix english readme link (c58b01d)
- docs(readme): update demo links (4fd7ba4)
- 添加e2e (07e18e2)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>
- ovst <wangjueszu@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.5.51 (2026-01-25)

### 🚀 Features

- 全面优化多端响应式适配 (1b06d2f)
- 统一媒体预览组件并优化缩略图展示 (a617211)
- enhance pencil and eraser settings with shape selection (cbde7b2)
- 增强文字属性面板样式设置功能 (2b437fa)
- add alignment, distribution, and boolean operation buttons (811111e)

### 🩹 Fixes

- enhance task submission and execution checks (7a92d70)

### 🔧 Chores

- 去掉参数n (989e919)
- docs: 添加 Slate-React Leaf DOM 结构稳定性规则 (a20c4a4)
- docs: 添加编码规则 - Clipper 布尔运算结果处理 (fe13ef8)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.5.50 (2026-01-24)

### 🚀 Features

- 对比模式下视频联动同步播放和重置 (ea9b932)

### 🔧 Chores

- docs: 添加编码规则 - useCallback 定义顺序 (6f891ea)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.5.49 (2026-01-24)

### 🚀 Features

- enhance user manual generation and CDN integration (ba4746d)
- enhance user manual generation and E2E testing (607ec7e)
- 添加用户手册生成系统和 E2E 测试增强 (4daff77)
- 新增 TaskProgressOverlay 组件显示任务进度 (0ab1aa3)

### 🩹 Fixes

- 使用 Context 共享健康状态数据修复显示不一致问题 (b95247a)

### 🔧 Chores

- update app version to 0.5.48 and adjust build time (b97371b)
- docs(claude): 添加新规则 - 日志记录应反映实际发送的数据 (c714761)
- docs(claude): 添加新规则 - 多组件共享异步数据时使用 Context (c688c15)
- docs(claude): 添加新规则 - Props 变化时重置组件内部状态 (2011c2e)
- docs(claude): 添加新规则 - Flex布局兄弟元素隐藏导致宽度变化 (9a917ab)
- Update README.md (cf65ccf)
- Update README_en.md (aa6986d)
- docs(readme): align Chinese link (3d37033)
- docs(readme): fix english readme link (c58b01d)
- docs(readme): update demo links (4fd7ba4)
- 添加e2e (07e18e2)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- ovst <wangjueszu@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.5.44 (2026-01-23)

### 🔧 Chores

- update app version to 0.5.43 and adjust build time (f0f1d52)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.5.43 (2026-01-23)

### 🚀 Features

- 点击画板自动关闭项目抽屉和工具箱抽屉 (a91ed12)
- update Xingtu labels and model hints (8571c79)

### 🩹 Fixes

- 修复图片覆盖保存时缩放比例计算错误 (81a59ba)

### 🔧 Chores

- update app version to 0.5.42 and adjust build time (14e6185)
- bump version to 0.5.1 (7fadafd)
- style(settings-dialog): 美化设置弹窗并统一模型选择器样式 (e7c30ce)
- refactor(image-editor): 提取图片尺寸计算逻辑到共享模块 (596faab)
- docs: 添加编码规则 - 模式切换状态同步 (db19940)
- Update online experience link in README (b3a8b4c)
- Update README.md (339e720)
- Rename project to Xingtu and update README (38032e6)
- 添加readme 的 git 图素材 (c0bb49a)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liquidliang <ljquan@qq.com>
- Xingtu Developer <noreply@aitu.chat>
- gongchengtu <1817063960@qq.com>
- ovst <wangjueszu@qq.com>

## 0.5.42 (2026-01-23)

### 🚀 Features

- update AI input parser to enhance prompt generation logic (272d73d)
- 优化分析模式 (60bf02a)
- 添加数据备份功能和进度显示 (cc74d29)
- 统一 Tooltip 样式并美化模型健康状态信号展示 (1076cb2)
- 初始化时自动滚动显示 AI 按钮 (f110657)
- 优化角色创建时间轴视频帧显示 (2a927bc)
- 添加工具窗口最小化/恢复动画 (0cba6b1)
- 优化工具箱 UI 和工具栏交互 (b866b85)
- 增强敏感信息处理和日志记录 (70c83b6)
- add media library button and functionality to AI input bar (3ece148)
- 优化素材库筛选按钮间距并实现三段式循环排序模式 (1264b42)

### 🩹 Fixes

- 阻止无效配置下创建的任务被执行 (fae807b)
- 修复多选元素时填充色图标显示异常 (bbfeaaa)
- 修复视频插入函数名错误 (9593b02)

### 🔧 Chores

- 清理调试日志和修复未定义函数调用 (718c4fb)
- update app version to 0.5.41 and adjust build time (0fc7aeb)
- bump version to 0.5.41 (7b3ffc0)
- bump version to 0.5.40 (d78e75c)
- bump version to 0.5.39 (1fa11f9)
- bump version to 0.5.39 (95ab336)
- update app version to 0.5.38 and adjust build time in version.json (47d1029)
- bump version to 0.5.38 (ee623df)
- bump version to 0.5.36 (ab4d3e2)
- update app version to 0.5.37 and enhance tool URL handling (fba900c)
- docs: 精简 CLAUDE.md 并补充编码规则 (2ca7cc9)
- refactor(image-splitter): 提取共享模块统一拆分配置 (10816e8)
- docs: 添加共享模块设计规则 (53d0900)
- refactor(health): 使用单例控制模型健康状态 API 调用频率 (cfb92dd)
- docs(claude): 添加新规则 - 无效配置下的数据不应被持久化或执行 (5bfa029)
- docs: 添加编码规则 - 布局抖动、结构化数据与图标验证 (27dedea)
- style(winbox): optimize titlebar buttons for light theme and fix black square issue (0a45250)
- refactor(sw-debug): 模块化重构调试面板 (33aa2ed)
- refactor(auto-complete-shape-picker): update shape icons to use JSX syntax (5049f6e)
- docs: 添加 SW 枚举值小写规则 (dceb83a)
- docs(rules): 添加 Blob MIME 类型获取和 Shift 连选防文本选中规则 (c0e63d0)
- docs(claude): 添加新规则 - 同名模块的全局状态隔离问题 (3d92dda)
- docs: 添加 UI 交互规范 - 可点击容器、筛选联动、全局配色 (1d8c77c)
- docs: 添加强制重绘 void 前缀规则 (98b400f)
- docs: 添加 TDesign Dropdown popupProps 透传规则 (14925fb)
- docs: 更新项目文档，修正在线应用链接并优化 CLAUDE.md 结构 (dfef8c1)
- docs(claude): 添加项目概念文档和维护规则 (70fddff)
- docs(claude): 添加敏感信息过滤相关安全规则 (1156efc)
- docs(claude): 添加新交互和样式规则 - 三段式排序与筛选岛对齐 (ec72cd5)
- docs(claude): 更新规则 - 图标组件渲染错误示例补充三元表达式场景 (4116347)
- docs(claude): 添加敏感信息模板变量安全处理规则 (a206daa)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.5.41 (2026-01-23)

### 🚀 Features

- 优化分析模式 (60bf02a)
- 添加数据备份功能和进度显示 (cc74d29)
- 统一 Tooltip 样式并美化模型健康状态信号展示 (1076cb2)
- 初始化时自动滚动显示 AI 按钮 (f110657)

### 🩹 Fixes

- 修复多选元素时填充色图标显示异常 (bbfeaaa)

### 🔧 Chores

- bump version to 0.5.40 (d78e75c)
- bump version to 0.5.39 (1fa11f9)
- refactor(sw-debug): 模块化重构调试面板 (33aa2ed)
- refactor(auto-complete-shape-picker): update shape icons to use JSX syntax (5049f6e)
- docs: 添加 SW 枚举值小写规则 (dceb83a)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>

## 0.5.39 (2026-01-22)

### 🚀 Features

- 添加数据备份功能和进度显示 (cc74d29)
- 统一 Tooltip 样式并美化模型健康状态信号展示 (1076cb2)
- 初始化时自动滚动显示 AI 按钮 (f110657)
- 优化角色创建时间轴视频帧显示 (2a927bc)
- 添加工具窗口最小化/恢复动画 (0cba6b1)
- 优化工具箱 UI 和工具栏交互 (b866b85)
- 增强敏感信息处理和日志记录 (70c83b6)
- add media library button and functionality to AI input bar (3ece148)
- 优化素材库筛选按钮间距并实现三段式循环排序模式 (1264b42)
- 添加模型健康状态功能并更新 CLAUDE.md 文档 (98f9319)
- implement precache manifest generation and update service worker activation strategy (f44fea3)
- implement responsive layout with ResizeObserver and improve styling consistency (72057e9)

### 🩹 Fixes

- 修复多选元素时填充色图标显示异常 (bbfeaaa)
- 修复视频插入函数名错误 (9593b02)
- 修复 ModelDropdown Portal 模式下的位置计算和点击选择问题 (f075058)

### 🔧 Chores

- update app version to 0.5.38 and adjust build time in version.json (47d1029)
- bump version to 0.5.38 (ee623df)
- bump version to 0.5.36 (ab4d3e2)
- update app version to 0.5.37 and enhance tool URL handling (fba900c)
- bump version to 0.5.37 (3a06964)
- update app version to 0.5.36 and adjust build time in version.json (b1cd461)
- bump version to 0.5.36 (0c8c796)
- update app version to 0.5.35 and adjust build time in version.json (7b8c32e)
- bump version to 0.5.35 (cfa8949)
- bump version to 0.5.34 (2903d85)
- bump version to 0.5.33 (e9cd0ec)
- bump version to 0.5.32 (f0ff19e)
- bump version to 0.5.31 (8d4cb2d)
- update app version to 0.5.30 and adjust build time in version.json (1512fd7)
- bump version to 0.5.30 (5279f38)
- refactor(auto-complete-shape-picker): update shape icons to use JSX syntax (5049f6e)
- docs: 添加 SW 枚举值小写规则 (dceb83a)
- docs(rules): 添加 Blob MIME 类型获取和 Shift 连选防文本选中规则 (c0e63d0)
- docs(claude): 添加新规则 - 同名模块的全局状态隔离问题 (3d92dda)
- docs: 添加 UI 交互规范 - 可点击容器、筛选联动、全局配色 (1d8c77c)
- docs: 添加强制重绘 void 前缀规则 (98b400f)
- docs: 添加 TDesign Dropdown popupProps 透传规则 (14925fb)
- docs: 更新项目文档，修正在线应用链接并优化 CLAUDE.md 结构 (dfef8c1)
- docs(claude): 添加项目概念文档和维护规则 (70fddff)
- docs(claude): 添加敏感信息过滤相关安全规则 (1156efc)
- docs(claude): 添加新交互和样式规则 - 三段式排序与筛选岛对齐 (ec72cd5)
- docs(claude): 更新规则 - 图标组件渲染错误示例补充三元表达式场景 (4116347)
- docs(claude): 添加敏感信息模板变量安全处理规则 (a206daa)
- docs(claude): 添加关于批量操作按钮视觉层级和 URL 模板变量处理的新规则 (1891b1e)
- docs(claude): 添加关于 Tooltip 布局、筛选逻辑和 UI 设计原则的新规则 (d7eaca8)
- docs(claude): 添加新规则 - 嵌套滚动容器和动态高度容器的滚动事件处理 (7e6c26b)
- refactor: update HandIcon SVG paths for improved structure and clarity (1741b5a)
- docs(claude): 添加有关图标组件规范和筛选逻辑修复的新规则 (0d35d22)
- docs(claude): 添加新规则 - CustomEvent 传递硬编码占位符问题 (4543793)
- docs(claude): 添加 Service Worker 自动激活策略文档 (a3983d7)
- docs(claude): 补充预缓存不阻塞首次访问的说明 (d5ca154)
- docs(claude): 添加 Service Worker 预缓存机制文档 (c26bd23)
- docs(claude): 添加新规则 - 获取第三方组件位置应使用 getBoundingClientRect() (082f274)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liquidliang <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.5.38 (2026-01-21)

### 🔧 Chores

- bump version to 0.5.36 (ab4d3e2)
- update app version to 0.5.37 and enhance tool URL handling (fba900c)
- bump version to 0.5.37 (3a06964)
- update app version to 0.5.36 and adjust build time in version.json (b1cd461)
- bump version to 0.5.36 (0c8c796)
- docs(claude): 更新规则 - 图标组件渲染错误示例补充三元表达式场景 (4116347)
- docs(claude): 添加敏感信息模板变量安全处理规则 (a206daa)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.5.37 (2026-01-21)

### 🔧 Chores

- update app version to 0.5.36 and adjust build time in version.json (b1cd461)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.5.36 (2026-01-21)

### 🚀 Features

- 添加模型健康状态功能并更新 CLAUDE.md 文档 (98f9319)
- implement precache manifest generation and update service worker activation strategy (f44fea3)
- implement responsive layout with ResizeObserver and improve styling consistency (72057e9)
- enhance split and restore functionality for WinBoxWindow (a53c0b8)
- 优化批量出图 UI 和交互体验 (94e2e05)

### 🩹 Fixes

- 修复 ModelDropdown Portal 模式下的位置计算和点击选择问题 (f075058)

### 🔧 Chores

- update app version to 0.5.35 and adjust build time in version.json (7b8c32e)
- bump version to 0.5.35 (cfa8949)
- bump version to 0.5.34 (2903d85)
- bump version to 0.5.33 (e9cd0ec)
- bump version to 0.5.32 (f0ff19e)
- bump version to 0.5.31 (8d4cb2d)
- update app version to 0.5.30 and adjust build time in version.json (1512fd7)
- bump version to 0.5.30 (5279f38)
- update app version to 0.5.29 and adjust build time (4a0edf6)
- docs(claude): 添加关于批量操作按钮视觉层级和 URL 模板变量处理的新规则 (1891b1e)
- docs(claude): 添加关于 Tooltip 布局、筛选逻辑和 UI 设计原则的新规则 (d7eaca8)
- docs(claude): 添加新规则 - 嵌套滚动容器和动态高度容器的滚动事件处理 (7e6c26b)
- refactor: update HandIcon SVG paths for improved structure and clarity (1741b5a)
- docs(claude): 添加有关图标组件规范和筛选逻辑修复的新规则 (0d35d22)
- docs(claude): 添加新规则 - CustomEvent 传递硬编码占位符问题 (4543793)
- docs(claude): 添加 Service Worker 自动激活策略文档 (a3983d7)
- docs(claude): 补充预缓存不阻塞首次访问的说明 (d5ca154)
- docs(claude): 添加 Service Worker 预缓存机制文档 (c26bd23)
- docs(claude): 添加新规则 - 获取第三方组件位置应使用 getBoundingClientRect() (082f274)
- docs(claude): 添加新规则 - 独立的 React 树缺少上下文环境 (eac542f)
- docs(claude): 添加新规则 - 传递给第三方库的回调无法获取最新 React state (306ac42)
- docs(claude): 添加新规则 - 点击外部关闭应使用全局事件监听而非透明遮罩层 (36785f1)
- docs(claude): 添加新规则 - React Context 回调中必须使用函数式更新 (3b89eb2)
- docs(claude): 添加异步任务重试与恢复规范 (a7b61a0)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>
- liquid <ljquan@qq.com>

## 0.5.34 (2026-01-21)

### 🚀 Features

- implement precache manifest generation and update service worker activation strategy (f44fea3)

### 🔧 Chores

- docs(claude): 添加 Service Worker 自动激活策略文档 (a3983d7)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.5.32 (2026-01-21)

### 🔧 Chores

- docs(claude): 补充预缓存不阻塞首次访问的说明 (d5ca154)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.5.31 (2026-01-21)

### 🚀 Features

- implement responsive layout with ResizeObserver and improve styling consistency (72057e9)
- enhance split and restore functionality for WinBoxWindow (a53c0b8)
- 优化批量出图 UI 和交互体验 (94e2e05)

### 🩹 Fixes

- keep auto-insert aspect ratio (1457f27)
- preserve image ratio in payload (614fc8b)

### 🔧 Chores

- update app version to 0.5.30 and adjust build time in version.json (1512fd7)
- bump version to 0.5.30 (5279f38)
- update app version to 0.5.29 and adjust build time (4a0edf6)
- bump version to 0.5.29 (9adb98a)
- bump version to 0.5.28 (9fca109)
- docs(claude): 添加 Service Worker 预缓存机制文档 (c26bd23)
- docs(claude): 添加新规则 - 获取第三方组件位置应使用 getBoundingClientRect() (082f274)
- docs(claude): 添加新规则 - 独立的 React 树缺少上下文环境 (eac542f)
- docs(claude): 添加新规则 - 传递给第三方库的回调无法获取最新 React state (306ac42)
- docs(claude): 添加新规则 - 点击外部关闭应使用全局事件监听而非透明遮罩层 (36785f1)
- docs(claude): 添加新规则 - React Context 回调中必须使用函数式更新 (3b89eb2)
- docs(claude): 添加异步任务重试与恢复规范 (a7b61a0)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.5.30 (2026-01-20)

### 🚀 Features

- enhance split and restore functionality for WinBoxWindow (a53c0b8)
- 优化批量出图 UI 和交互体验 (94e2e05)
- add reference image handling in LLM API logs and enhance task recovery mechanisms (c94b032)
- implement model dropdown component with search functionality and update AI input bar to use # for model selection (6aa6267)
- enhance performance panel with image count tracking and updated memory thresholds (5ec5172)
- 优化素材库 UI 交互、缩放缓存、Grid 布局及空间效率 (c64e4a7)

### 🩹 Fixes

- keep auto-insert aspect ratio (1457f27)
- preserve image ratio in payload (614fc8b)

### 🔧 Chores

- update app version to 0.5.29 and adjust build time (4a0edf6)
- bump version to 0.5.29 (9adb98a)
- bump version to 0.5.28 (9fca109)
- bump version to 0.5.27 (0b3c40b)
- bump version to 0.5.26 (10b2b16)
- enhance CDN response validation and update version to 0.5.25 (155ec00)
- bump version to 0.5.25 (8bd7f30)
- bump version to 0.5.22 (5571d3f)
- bump version to 0.5.21 (55ad29c)
- bump version to 0.5.20 (8bfc191)
- bump version to 0.5.19 (8707a5b)
- bump version to 0.5.18 (88c0dfd)
- bump version to 0.5.17 (91799c9)
- bump version to 0.5.17 and update build time in version.json (51b5f3f)
- bump version to 0.5.17 (c41c9bd)
- update paths for CDN compatibility and add npm publish scripts (e4cdca4)
- docs(claude): 添加新规则 - 独立的 React 树缺少上下文环境 (eac542f)
- docs(claude): 添加新规则 - 传递给第三方库的回调无法获取最新 React state (306ac42)
- docs(claude): 添加新规则 - 点击外部关闭应使用全局事件监听而非透明遮罩层 (36785f1)
- docs(claude): 添加新规则 - React Context 回调中必须使用函数式更新 (3b89eb2)
- docs(claude): 添加异步任务重试与恢复规范 (a7b61a0)
- docs(claude): 更新调试日志处理和命令行工具使用说明，添加后台清理任务日志记录示例 (30cf458)
- docs(claude): 添加 React 事件委托、筛选逻辑、Grid 布局及 UI 高度统一规则 (dcabd75)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liquidliang <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.5.29 (2026-01-20)

### 🚀 Features

- add reference image handling in LLM API logs and enhance task recovery mechanisms (c94b032)
- implement model dropdown component with search functionality and update AI input bar to use # for model selection (6aa6267)
- enhance performance panel with image count tracking and updated memory thresholds (5ec5172)

### 🩹 Fixes

- keep auto-insert aspect ratio (1457f27)
- preserve image ratio in payload (614fc8b)

### 🔧 Chores

- bump version to 0.5.28 (9fca109)
- bump version to 0.5.27 (0b3c40b)
- bump version to 0.5.26 (10b2b16)
- enhance CDN response validation and update version to 0.5.25 (155ec00)

### ❤️  Thank You

- gongchengtu <1817063960@qq.com>
- liquidliang <ljquan@qq.com>

## 0.5.26 (2026-01-20)

### 🚀 Features

- add reference image handling in LLM API logs and enhance task recovery mechanisms (c94b032)
- implement model dropdown component with search functionality and update AI input bar to use # for model selection (6aa6267)
- enhance performance panel with image count tracking and updated memory thresholds (5ec5172)

### 🔧 Chores

- enhance CDN response validation and update version to 0.5.25 (155ec00)
- bump version to 0.5.25 (8bd7f30)
- bump version to 0.5.22 (5571d3f)
- bump version to 0.5.21 (55ad29c)
- bump version to 0.5.20 (8bfc191)
- bump version to 0.5.19 (8707a5b)
- bump version to 0.5.18 (88c0dfd)
- bump version to 0.5.17 (91799c9)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.5.23 (2026-01-20)

### 🚀 Features

- 优化素材库 UI 交互、缩放缓存、Grid 布局及空间效率 (c64e4a7)

### 🔧 Chores

- bump version to 0.5.22 (5571d3f)
- bump version to 0.5.21 (55ad29c)
- bump version to 0.5.20 (8bfc191)
- bump version to 0.5.19 (8707a5b)
- bump version to 0.5.18 (88c0dfd)
- bump version to 0.5.17 (91799c9)
- bump version to 0.5.17 and update build time in version.json (51b5f3f)
- bump version to 0.5.17 (c41c9bd)
- docs(claude): 更新调试日志处理和命令行工具使用说明，添加后台清理任务日志记录示例 (30cf458)
- docs(claude): 添加 React 事件委托、筛选逻辑、Grid 布局及 UI 高度统一规则 (dcabd75)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.5.17 (2026-01-20)

### 🚀 Features

- 优化素材库 UI 交互、缩放缓存、Grid 布局及空间效率 (c64e4a7)
- implement CORS domain handling and cache validation (de13297)
- 封装函数不应被绕过、页面卸载清理定时器 (f6bd3af)
- enhance prompt history management with preset prompts (8e8738c)

### 🔧 Chores

- update paths for CDN compatibility and add npm publish scripts (e4cdca4)
- bump version to 0.5.16 (ef30e2e)
- bump version to 0.5.15 (c126ed5)
- update project references from aitu.chat to xingtu.live (345b0a9)
- bump version to 0.5.14 (305fa7f)
- docs(claude): 添加 React 事件委托、筛选逻辑、Grid 布局及 UI 高度统一规则 (dcabd75)
- docs(claude): 添加部署脚本安全实践规则 (ad9ef4d)
- docs(claude): 添加新规则 - SSH 远程执行复杂 Shell 命令应使用 base64 编码 (e37666f)
- refactor(sw-debug): reorganize cache statistics panel and enhance LLM API log entry styles (31f684f)
- docs(claude): 添加 Service Worker opaque 响应处理和缓存验证规则 (bdbaff4)
- docs(claude): 添加缓存策略和数据一致性规则 (310b7d0)
- docs(claude): 添加新规则 - 封装函数不应被绕过、页面卸载清理定时器 (06ae079)
- docs(claude): 添加独立页面配色一致性规则 (7876471)
- docs(claude): 添加 UI 重构信息完整性和日志保留优先级规则 (d402148)
- docs(claude): 添加组件空状态处理和文案通用性规则 (d2c1569)
- v0.5.11 (f7e6f0b)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>

## 0.5.15 (2026-01-20)

### 🔧 Chores

- update project references from aitu.chat to xingtu.live (345b0a9)
- bump version to 0.5.14 (305fa7f)
- docs(claude): 添加部署脚本安全实践规则 (ad9ef4d)
- docs(claude): 添加新规则 - SSH 远程执行复杂 Shell 命令应使用 base64 编码 (e37666f)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.5.14 (2026-01-19)

### 🚀 Features

- implement CORS domain handling and cache validation (de13297)
- 封装函数不应被绕过、页面卸载清理定时器 (f6bd3af)
- enhance prompt history management with preset prompts (8e8738c)
- implement user confirmation for service worker upgrades (f0571a7)
- add memory monitoring and crash logging features (19f54ec)

### 🩹 Fixes

- 修复 workflows Map 和 setInterval 内存泄漏 (bfb7ed5)

### 🔧 Chores

- bump version to 0.5.13 (2edadb3)
- bump version to 0.5.10 and update changelog (305b5d7)
- refactor(sw-debug): reorganize cache statistics panel and enhance LLM API log entry styles (31f684f)
- docs(claude): 添加 Service Worker opaque 响应处理和缓存验证规则 (bdbaff4)
- docs(claude): 添加缓存策略和数据一致性规则 (310b7d0)
- docs(claude): 添加新规则 - 封装函数不应被绕过、页面卸载清理定时器 (06ae079)
- docs(claude): 添加独立页面配色一致性规则 (7876471)
- docs(claude): 添加 UI 重构信息完整性和日志保留优先级规则 (d402148)
- docs(claude): 添加组件空状态处理和文案通用性规则 (d2c1569)
- v0.5.11 (f7e6f0b)
- 添加更多版本 (c4c7e3d)
- docs(claude): 添加内存泄漏预防规则 (d1112d0)
- docs(claude): 添加 SW 更新和配置同步规则 (2fb1088)
- docs(claude): 添加新规则 - navigator.storage.estimate() 返回浏览器配额而非磁盘空间 (c823877)
- 优化渐变 (de86f2a)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liquidliang <ljquan@qq.com>

## 0.5.12 (2026-01-19)

### 🚀 Features

- implement CORS domain handling and cache validation (de13297)
- 封装函数不应被绕过、页面卸载清理定时器 (f6bd3af)
- enhance prompt history management with preset prompts (8e8738c)

### 🔧 Chores

- refactor(sw-debug): reorganize cache statistics panel and enhance LLM API log entry styles (31f684f)
- docs(claude): 添加 Service Worker opaque 响应处理和缓存验证规则 (bdbaff4)
- docs(claude): 添加缓存策略和数据一致性规则 (310b7d0)
- docs(claude): 添加新规则 - 封装函数不应被绕过、页面卸载清理定时器 (06ae079)
- docs(claude): 添加独立页面配色一致性规则 (7876471)
- docs(claude): 添加 UI 重构信息完整性和日志保留优先级规则 (d402148)
- docs(claude): 添加组件空状态处理和文案通用性规则 (d2c1569)
- v0.5.11 (f7e6f0b)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>

## 0.5.11 (2026-01-18)

### 🚀 Features

- implement user confirmation for service worker upgrades (f0571a7)
- add memory monitoring and crash logging features (19f54ec)

### 🩹 Fixes

- 修复 workflows Map 和 setInterval 内存泄漏 (bfb7ed5)

### 🔧 Chores

- bump version to 0.5.10 and update changelog (305b5d7)
- 添加更多版本 (c4c7e3d)
- docs(claude): 添加内存泄漏预防规则 (d1112d0)
- docs(claude): 添加 SW 更新和配置同步规则 (2fb1088)
- docs(claude): 添加新规则 - navigator.storage.estimate() 返回浏览器配额而非磁盘空间 (c823877)
- 优化渐变 (de86f2a)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.5.10 (2026-01-17)

### 🔧 Chores

- v0.5.9 (c1c5d5b)
- refactor(fill-panel): enhance fill panel functionality and styles (160170b)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.5.9 (2026-01-17)

### 🚀 Features

- enhance fill options with gradient and image support (206af04)

### 🔧 Chores

- bump version to 0.5.8 and update changelog (8f5953b)
- update version to 0.5.2 and enhance fill panel styles (e2b4a84)
- feat： 调整4k配置 (5bfcb9e)
- docs(claude): 添加异步任务幂等性检查规则 (e046e57)
- docs(claude): 添加单击/双击区分场景的计时器清理规则 (079374c)
- docs(claude): 添加 Service Worker 更新提示开发模式规则 (9b8f79e)
- docs(claude): 更新规则 - 滑块节流和 Plait API 签名 (2286e34)
- docs(claude): 添加工具函数使用和滑块更新策略规则 (f51f914)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- liquidliang <ljquan@qq.com>

## 0.5.8 (2026-01-17)

### 🚀 Features

- add debug panel and logging enhancements (12576ee)

### 🔧 Chores

- bump version to 0.5.7 and update changelog (b38a485)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.5.7 (2026-01-17)

### 🚀 Features

- enhance postMessage logging and workflow recovery (d76a0e9)

### 🔧 Chores

- bump version to 0.5.6 and update changelog (6855673)
- refactor(ai-input-bar, project-drawer): remove debug logs and add cleanup effect (b1f58f5)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.5.6 (2026-01-17)

### 🚀 Features

- add touch support for mobile interactions (d7a30ea)

### 🔧 Chores

- bump version to 0.5.5 and update changelog (e4b7c79)
- style(ai-input-bar, version-update-prompt): enhance responsiveness and positioning for mobile devices (bbcd896)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.5.5 (2026-01-17)

### 🚀 Features

- 添加双击重命名功能 (e7968f1)

### 🔧 Chores

- bump version to 0.5.4 and update changelog (9baf1a7)
- refactor(storage): enhance database version handling and integrity checks (dcfd46a)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- Claude Code <claude@anthropic.com>

## 0.5.4 (2026-01-17)

### 🩹 Fixes

- improve version update handling and error response caching (eb8da7e)

### 🔧 Chores

- bump version to 0.5.3 and update changelog (d83ffc4)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.5.3 (2026-01-16)

### 🔧 Chores

- 去掉重试逻辑 (77391d8)
- v0.5.2 (470742f)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.5.2 (2026-01-16)

### 🚀 Features

- add multi-selection resize functionality and new stroke styles (85271a2)
- implement viewport saving and restoration functionality (e8b1f31)
- add corner radius feature and enhance pen settings (05b9a4d)
- 当 API 返回 401 错误时自动打开设置对话框 (ec60835)
- 优化工具栏交互体验 (3077f76)
- 支持保存文件时嵌入媒体数据 (cb2fcac)
- 使用统一拾色器替换阴影和渐变的颜色选择器 (5c2b5d8)
- 添加画笔描边样式设置并将画笔工具移至工具栏 (9651a75)
- 优化画笔和橡皮擦功能 (79e1edf)
- 实现画笔和橡皮擦设置工具栏 (1d5ceea)
- 素材库增加 unified-cache 数据源 (e0d23fa)
- 添加备份恢复功能支持导出导入提示词、项目和素材 (ee8f66f)
- 添加参考图片智能处理和压缩功能 (250cd1b)
- 集成 Sentry 错误监控并修复角色 API (dc4c81e)
- 优化图层控制面板和任务队列交互 (2d4bb28)
- 添加任务多选和批量操作功能 (85ead4c)
- 增强批量出图功能和任务超时机制 (2f26597)
- 实现视频提示词即时保存到预设列表 (275a7ff)
- 添加 isDataReady 状态防止灵感板闪烁 (c615c27)
- 添加 Claude Code 工作流自动化斜杠命令 (3353665)
- 添加提示词预设置顶和删除功能 (06e7ba9)
- 完善 Service Worker 任务队列和工作流执行 (b99f452)
- 添加阴影颜色设置并加宽面板 (765ed7d)
- 完善文本属性面板和字体管理系统 (057fdef)
- 添加智能文本粘贴功能和文档更新命令 (334dfd0)
- 增强图片合并功能，支持图形、线条、手绘等元素 (2c769d5)
- 增强视频缓存持久化和素材库 URL 支持 (8d45cb8)
- 增强图片尺寸感知和智能缓存处理 (740f953)
- 实现合并视频的 Service Worker 缓存方案 (e058f92)
- 添加提示词工具快捷入口 (c2ff40a)
- 添加历史提示词功能支持置顶 (bb52bc6)
- 实现统一图片缓存系统 (e8bd3ca)
- 添加 SizeDropdown 组件优化生图模型尺寸参数适配 (8b49477)
- 实现工作区缩放和左对齐插入位置功能 (0b4516c)
- 新增共享工具函数库并重构相关代码 (a34e2eb)
- 添加灵感板组件和内容上传功能 (531e612)

### 🩹 Fixes

- 修复备份恢复服务的 TypeScript 类型错误 (8181a3f)
- improve key assignment and stroke width calculation (52bf30f)
- use pnpm instead of npm for Vercel deployment (315fd5d)
- 移除自动删除用户数据的逻辑 (0942aa5)
- 修复 agent_flow 工作流卡在"待开始"状态的问题 (718c644)
- 修复页面加载时小地图自动展开的问题 (9cd009d)
- 修复宫格图生成时未使用选择的图像模型 (2d88b98)
- 优化尺寸参数优先级策略 (650b9c5)
- 修复任务删除和视频并发生成问题 (906e0d6)
- 修复 API Key 加密问题和参考图残留问题 (d11752e)
- 修复 z-index 层级和双击事件穿透问题 (cea2642)
- 修复工作流重复提交和发送按钮状态问题 (6ce9690)
- 修复多行 console.log 注释导致的语法错误 (124b5dd)
- 修复画板初始状态闪烁问题并优化视频恢复逻辑 (0a1aa0c)
- 改进LLM响应解析的健壮性 (dd7c0d9)
- 修正示例1中图片生成提示词过于扩展的问题 (6d2ffd6)
- 移除手动分包让Vite自动处理避免循环依赖 (d9cfe7d)
- 更新CSP策略添加us-assets.i.posthog.com域名 feat(sw): 添加对非http/https请求的过滤 docs: 更新文档添加service worker源码路径 chore: 更新构建时间和版本信息 (6b011de)
- 仅缓存HTTP请求的响应以避免错误 (f6c022a)

### 🔧 Chores

- 清理 console.log 调试日志 (77340d8)
- 发布版本 0.5.0 (d2befb1)
- 注释掉所有 console.log/debug/info 日志 (9fe03cf)
- 更新版本号至0.4.3并优化vite分包配置 (3349854)
- 更新构建命令和版本文件时间戳 (9ec3837)
- docs(claude): 添加新规则 - 生产代码禁止保留调试日志 (00df2f7)
- refactor(task-queue): 移除重复提交检测并优化存储性能 (e1785a8)
- docs(claude): 添加新规则 - 重复提交检测应由 UI 层处理 (c2e367f)
- docs(claude): 添加新规则 - API 请求禁止重试 (b564930)
- refactor(api): 移除 API 重试逻辑简化错误处理 (4ba9774)
- 优化画笔 (2a66799)
- docs(claude): 添加新规则 - 扩展外部库的枚举类型 (156668e)
- docs(claude): 添加新规则 - Plait 选中状态渲染触发 (34db489)
- docs(claude): 添加新规则 - Hover 延迟操作计时器清理 (ebe979f)
- docs(claude): 添加新规则 - 元组类型 vs 数组类型 (82f9d7a)
- 优化形状 (ceff394)
- docs(claude): 添加新规则 - 对象字面量只能指定已知属性 (378a512)
- docs(claude): 添加新规则 - 高频事件处理性能优化 (1cfe7b4)
- docs(claude): 添加新规则 - PointerEvent 压力感应兼容性 (70f325e)
- 优化滑块位置 (fec0f9b)
- docs(claude): 添加新规则 - 绝对定位子元素需要正确的父容器设置 (babc0f9)
- docs(claude): 添加新规则 - 新增 UI 组件需同步更新全局事件排除列表 (4876bc8)
- docs(claude): 添加新规则 - 相对路径 URL 解析规范 (1c988de)
- 优化缓存获取 (dbafcc4)
- docs(claude): 添加新规则 - Cache API 缓存 key 一致性规范 (bb22cae)
- 添加调试日志 (4a5675b)
- docs(claude): 添加新规则 - Service Worker 内部处理虚拟路径 URL (fceb939)
- docs(claude): 添加新规则 - 虚拟路径 URL 匹配规范 (91c1f65)
- docs(claude): 添加新规则 - 媒体 URL 处理规范（避免 CSP 和生命周期问题） (f8272b4)
- style(text-property): 自定义渐变和预设渐变放在同一行展示 (004cd48)
- style(text-property): 调整阴影渐变拾色器宽度与设置面板一致 (588b2ea)
- docs(claude): 添加新规则 - Freehand 元素属性设置需要自定义 callback (e27bf28)
- docs(claude): 添加调试日志清理规范 (3ad8400)
- refactor(image): extract shared border trimming utilities and update development guidelines (90fad36)
- docs: 添加 Service Worker 初始化时序规则 (3dfa4d1)
- 去掉删除遗留db问题 (c86ebba)
- 注释掉调试日志 (898b77b)
- perf(media-library): 实现任务队列和素材库的分页加载与虚拟滚动 (5ace768)
- docs(readme): 添加 Vercel 和 Netlify 一键部署按钮 (424b1b8)
- deps: 移除 @sentry/react 并升级 typescript (155d05e)
- 优化导出 (7b9d2eb)
- perf(image): 优化图片压缩算法使用二分查找 (596a689)
- 迁移存储 (0608b09)
- docs(codebuddy): 添加 Sora-2 角色 API 约定文档 (f25a09d)
- 完善命令 (866c87a)
- 优化提示词 (a54ce64)
- 更新Claude.md (bf34c5c)
- 优化 (574e17e)
- 优化插入位置 (70ee8f9)
-  优化 (0ab27b1)
- 优化素材库展示 (0a876a0)
- 优化图片上传到素材库 (ff7a07d)
- 优化缓存 (7b65b7c)
- style(ai-input-bar): 优化灵感板与输入框的无缝连接UI (767f8c8)
- docs: 更新 CLAUDE.md 文档，添加新功能说明 (fcfe109)
- docs(agent): 更新系统提示以明确JSON响应格式要求 (b01ddf5)
- refactor(vite配置): 简化分包策略让Vite自动处理依赖 (05c1b37)
- refactor(vite配置): 移除mermaid手动分包改为自动处理 (0b0cd48)
- refactor(vite): 简化mermaid打包配置以避免循环依赖问题 (f5c1ff5)
- build: 更新构建配置和依赖项 (216f157)
- refactor(utils): 重构工具模块并迁移共享代码到独立包 (69233dd)
- perf(vite): 优化手动分块策略以按需加载依赖 (5055de6)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.5.0 (2026-01-13)

### 🚀 Features

- 添加备份恢复功能支持导出导入提示词、项目和素材 (ee8f66f)
- 添加参考图片智能处理和压缩功能 (250cd1b)
- 集成 Sentry 错误监控并修复角色 API (dc4c81e)
- 优化图层控制面板和任务队列交互 (2d4bb28)
- 添加任务多选和批量操作功能 (85ead4c)
- 增强批量出图功能和任务超时机制 (2f26597)
- 实现视频提示词即时保存到预设列表 (275a7ff)
- 添加 isDataReady 状态防止灵感板闪烁 (c615c27)
- 添加 Claude Code 工作流自动化斜杠命令 (3353665)
- 添加提示词预设置顶和删除功能 (06e7ba9)
- 完善 Service Worker 任务队列和工作流执行 (b99f452)
- 添加阴影颜色设置并加宽面板 (765ed7d)
- 完善文本属性面板和字体管理系统 (057fdef)
- 添加智能文本粘贴功能和文档更新命令 (334dfd0)
- 增强图片合并功能，支持图形、线条、手绘等元素 (2c769d5)
- 增强视频缓存持久化和素材库 URL 支持 (8d45cb8)
- 增强图片尺寸感知和智能缓存处理 (740f953)
- 实现合并视频的 Service Worker 缓存方案 (e058f92)
- 添加提示词工具快捷入口 (c2ff40a)
- 添加历史提示词功能支持置顶 (bb52bc6)
- 实现统一图片缓存系统 (e8bd3ca)
- 添加 SizeDropdown 组件优化生图模型尺寸参数适配 (8b49477)
- 实现工作区缩放和左对齐插入位置功能 (0b4516c)
- 新增共享工具函数库并重构相关代码 (a34e2eb)
- 添加灵感板组件和内容上传功能 (531e612)

### 🩹 Fixes

- 优化尺寸参数优先级策略 (650b9c5)
- 修复任务删除和视频并发生成问题 (906e0d6)
- 修复 API Key 加密问题和参考图残留问题 (d11752e)
- 修复 z-index 层级和双击事件穿透问题 (cea2642)
- 修复工作流重复提交和发送按钮状态问题 (6ce9690)
- 修复多行 console.log 注释导致的语法错误 (124b5dd)
- 修复画板初始状态闪烁问题并优化视频恢复逻辑 (0a1aa0c)
- 改进LLM响应解析的健壮性 (dd7c0d9)
- 修正示例1中图片生成提示词过于扩展的问题 (6d2ffd6)
- 移除手动分包让Vite自动处理避免循环依赖 (d9cfe7d)
- 更新CSP策略添加us-assets.i.posthog.com域名 feat(sw): 添加对非http/https请求的过滤 docs: 更新文档添加service worker源码路径 chore: 更新构建时间和版本信息 (6b011de)
- 仅缓存HTTP请求的响应以避免错误 (f6c022a)

### 🔧 Chores

- 注释掉所有 console.log/debug/info 日志 (9fe03cf)
- 更新版本号至0.4.3并优化vite分包配置 (3349854)
- 更新构建命令和版本文件时间戳 (9ec3837)
- deps: 移除 @sentry/react 并升级 typescript (155d05e)
- 优化导出 (7b9d2eb)
- perf(image): 优化图片压缩算法使用二分查找 (596a689)
- 迁移存储 (0608b09)
- docs(codebuddy): 添加 Sora-2 角色 API 约定文档 (f25a09d)
- 完善命令 (866c87a)
- 优化提示词 (a54ce64)
- 更新Claude.md (bf34c5c)
- 优化 (574e17e)
- 优化插入位置 (70ee8f9)
-  优化 (0ab27b1)
- 优化素材库展示 (0a876a0)
- 优化图片上传到素材库 (ff7a07d)
- 优化缓存 (7b65b7c)
- style(ai-input-bar): 优化灵感板与输入框的无缝连接UI (767f8c8)
- docs: 更新 CLAUDE.md 文档，添加新功能说明 (fcfe109)
- docs(agent): 更新系统提示以明确JSON响应格式要求 (b01ddf5)
- refactor(vite配置): 简化分包策略让Vite自动处理依赖 (05c1b37)
- refactor(vite配置): 移除mermaid手动分包改为自动处理 (0b0cd48)
- refactor(vite): 简化mermaid打包配置以避免循环依赖问题 (f5c1ff5)
- build: 更新构建配置和依赖项 (216f157)
- refactor(utils): 重构工具模块并迁移共享代码到独立包 (69233dd)
- perf(vite): 优化手动分块策略以按需加载依赖 (5055de6)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>
- liquid <ljquan@qq.com>

## 0.4.2 (2026-01-07)

### 🩹 Fixes

- 移除手动分包让Vite自动处理避免循环依赖 (edbc280)

### 🔧 Chores

- refactor(vite配置): 移除mermaid手动分包改为自动处理 (3d47e65)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.4.1 (2026-01-07)

### 🚀 Features

- 新增共享工具函数库并重构相关代码 (9b3c35b)
- 添加Service Worker构建配置并更新开发模式处理 (71fdd65)
- 为AI输入栏、聊天抽屉和弹出工具栏添加事件追踪 (24e5162)
- 更新版本至0.4.0，添加快捷工具栏并优化工具栏配置 (8627823)
- 升级版本至0.4.0并添加更新日志功能 (222ff9e)
- 添加版本更新提示组件和交互逻辑 (9084f9a)
- 更新版本信息和初始化数据加载方式 (e0fed52)
- 优化 WorkZone 位置策略 (604ef48)
- 添加长视频生成与恢复功能 (c7c3fa2)
- 发送工作流时不自动展开 ChatDrawer (3275cd1)
- 添加 WorkZone 画布元素显示工作流进度 (74ef571)
- 添加 @ 触发模型选择和固定底栏布局 (d409912)
- 添加长视频生成功能 (2f5d84f)
- 添加共享选中内容预览组件并重构相关代码 (2a8be45)
- 增强文本选择和复制功能并优化布局 (655e5a3)
- 添加SVG工具支持矢量图插入画布 (404e8e1)
- 添加AI分析内容显示和工作流消息优化 (8cd8277)
- 添加插入元素后自动滚动到视口的功能 (1671c60)

### 🩹 Fixes

- 更新CSP策略添加us-assets.i.posthog.com域名 feat(sw): 添加对非http/https请求的过滤 docs: 更新文档添加service worker源码路径 chore: 更新构建时间和版本信息 (618eb11)
- 仅缓存HTTP请求的响应以避免错误 (405b9b1)
- WorkZone 元素不触发 popup-toolbar (bc6298b)
- 优化白边检测逻辑并改进图片分割策略 (c864077)
- 修复工具栏按钮在打开状态时仍显示标题的问题 (8973b8b)
- 优化宫格图分割逻辑，避免误裁透明背景角色 (795fd28)
- 修复消息提示实例未正确关闭的问题 (0a5fbb9)
- 优化图片生成错误信息，返回原始 API 错误内容 (0c38f4c)

### 🔧 Chores

- 更新构建命令和版本文件时间戳 (8827450)
- 将package-lock.json添加到.gitignore中 (c9730ac)
- refactor(vite): 简化mermaid打包配置以避免循环依赖问题 (a216206)
- build: 更新构建配置和依赖项 (fef8673)
- refactor(utils): 重构工具模块并迁移共享代码到独立包 (b88e027)
- perf(vite): 优化手动分块策略以按需加载依赖 (bd87da4)
- refactor: 移除不必要的 rollupOptions 配置 (936e9a9)
- refactor: 移除未使用的ffmpeg依赖和视频合并服务 (51ecdb2)
- docs: 更新 CLAUDE.md 添加 WorkZone 文档 (3f9d194)
- 优化 (d785603)
- 优化宫格拆图 (47e4ca7)
- 优化宫格图 (acf2372)
- 优化历史提示词展示 (cf0f174)
- 优化提示词 (cdd5ac4)
- 优化拆分 (7c4d4fe)
- 优化拆图 (39885a1)
- 优化拆图 (e072ca0)
- 照片墙改成灵感图 (e3f1d9a)
- 优化拆分 (0d1ebce)
- 优化模型注入 (97d113e)
- 优化对话抽屉 (d7b1714)
- 优化抽屉输入框 (cfb87f3)
- 对话抽屉换到右侧 (50c8e72)
- 优化去白边 (94d2e24)
- 优化 (a49eba8)
- 优化拆分 (49828b8)
- 优化拆图 (22afb18)
- 添加照片墙 (24f1bee)
- 修改概念 (5213d28)
- 下载 (9f924a1)
- 优化切图 (f299821)
- 优化 (99d3342)
- 生成照片墙 (b17cf46)
- 优化图、视频mcp (8f2cee5)
- 添加思维导图mcp (ab51889)
- 增加冷启动提示词 (c705055)
- 修复对话 (a11d401)
- 优化指令 (9f8ad01)
- 优化工作流实现 (ba00566)
- 优化点击 (904a6c5)
- 优化 (f096ce2)
- 优化提示词 (f281595)
- 优化数量选择 (18ca11d)
- 优化多任务 (61c615b)
- 优化删除 (f000e29)
- 优化提示词 (530ad3a)
- 优化 (6121a6a)
- 并行 (fd793c7)
- 优化工作流 (0dbd619)
- 优化 (5bfcf88)
- 优化输入框 (7263289)
- 优化参数 (b46af91)
- 优化样式 (560ee6f)
- 样式优化 (726d27b)
- 优化 (1d24b51)
- 添加文本模型设置 (41670cf)
- 优化 (441db62)
- 优化输入框 (b0fe73c)
- 优化提示词 (50c06be)
- 优化输入框交互 (f0017b8)
- 优化输入框 (0d3624d)
- 优化 (e18c059)
- 样式优化 (620940d)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>
- wj <wj@MacBook-Pro.local>
- gongchengtu <1817063960@qq.com>

## 0.4.0 (2026-01-05)

### 🚀 Features

- 添加版本更新提示组件和交互逻辑 (9084f9a)
- 更新版本信息和初始化数据加载方式 (e0fed52)
- 优化 WorkZone 位置策略 (604ef48)
- 添加长视频生成与恢复功能 (c7c3fa2)
- 发送工作流时不自动展开 ChatDrawer (3275cd1)
- 添加 WorkZone 画布元素显示工作流进度 (74ef571)
- 添加 @ 触发模型选择和固定底栏布局 (d409912)
- 添加长视频生成功能 (2f5d84f)
- 添加共享选中内容预览组件并重构相关代码 (2a8be45)
- 增强文本选择和复制功能并优化布局 (655e5a3)
- 添加SVG工具支持矢量图插入画布 (404e8e1)
- 添加AI分析内容显示和工作流消息优化 (8cd8277)
- 添加插入元素后自动滚动到视口的功能 (1671c60)

### 🩹 Fixes

- WorkZone 元素不触发 popup-toolbar (bc6298b)
- 优化白边检测逻辑并改进图片分割策略 (c864077)
- 修复工具栏按钮在打开状态时仍显示标题的问题 (8973b8b)
- 优化宫格图分割逻辑，避免误裁透明背景角色 (795fd28)
- 修复消息提示实例未正确关闭的问题 (0a5fbb9)

### 🔧 Chores

- 将package-lock.json添加到.gitignore中 (c9730ac)
- refactor: 移除未使用的ffmpeg依赖和视频合并服务 (51ecdb2)
- docs: 更新 CLAUDE.md 添加 WorkZone 文档 (3f9d194)
- 优化 (d785603)
- 优化宫格拆图 (47e4ca7)
- 优化宫格图 (acf2372)
- 优化历史提示词展示 (cf0f174)
- 优化提示词 (cdd5ac4)
- 优化拆分 (7c4d4fe)
- 优化拆图 (39885a1)
- 优化拆图 (e072ca0)
- 照片墙改成灵感图 (e3f1d9a)
- 优化拆分 (0d1ebce)
- 优化模型注入 (97d113e)
- 优化对话抽屉 (d7b1714)
- 优化抽屉输入框 (cfb87f3)
- 对话抽屉换到右侧 (50c8e72)
- 优化去白边 (94d2e24)
- 优化 (a49eba8)
- 优化拆分 (49828b8)
- 优化拆图 (22afb18)
- 添加照片墙 (24f1bee)
- 修改概念 (5213d28)
- 下载 (9f924a1)
- 优化切图 (f299821)
- 优化 (99d3342)
- 生成照片墙 (b17cf46)
- 优化图、视频mcp (8f2cee5)
- 添加思维导图mcp (ab51889)
- 增加冷启动提示词 (c705055)
- 修复对话 (a11d401)
- 优化指令 (9f8ad01)
- 优化工作流实现 (ba00566)
- 优化点击 (904a6c5)
- 优化 (f096ce2)
- 优化提示词 (f281595)
- 优化数量选择 (18ca11d)
- 优化多任务 (61c615b)
- 优化删除 (f000e29)
- 优化提示词 (530ad3a)
- 优化 (6121a6a)
- 并行 (fd793c7)
- 优化工作流 (0dbd619)
- 优化 (5bfcf88)
- 优化输入框 (7263289)
- 优化参数 (b46af91)
- 优化样式 (560ee6f)
- 样式优化 (726d27b)
- 优化 (1d24b51)
- 添加文本模型设置 (41670cf)
- 优化 (441db62)
- 优化输入框 (b0fe73c)
- 优化提示词 (50c06be)
- 优化输入框交互 (f0017b8)
- 优化输入框 (0d3624d)
- 优化 (e18c059)
- 样式优化 (620940d)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- wj <wj@MacBook-Pro.local>
- liquidliang <ljquan@qq.com>

## 0.3.3 (2025-12-29)

### 🚀 Features

- 新增视图模式切换和性能优化 (c8eecf5)
- 优化场景时长选择器和角色提取限制 (12441ee)
- 优化故事场景模式UI和配置 (9ff294a)
- 添加 Sora-2 角色提取与复用功能 (26aefb0)
- 添加 Sora-2 故事场景模式支持 (7155c5b)
- 任务卡片添加打开链接功能 (07bb0b3)
- 优化图片加载体验 (3fba487)
- 任务创建时间改为绝对时间格式 (fc5a864)

### 🩹 Fixes

- 添加 @tanstack/react-virtual 到根目录依赖解决构建问题 (8a08d58)
- 优化视频生成参考图多图处理和模型切换保留 (e1782e8)
- 虚拟滚动优化和视图模式持久化 (af2978c)
- 优化角色任务队列展示和预览功能 (718052a)
- 修复角色接口兼容任务队列请求 (e1b8562)
- 角色加载优化 (4c4879b)
- 修复角色提取功能问题 (8a121ba)
- 修复创建角色缓存问题 (6372a89)
- 故事板支持@角色 (3f18b8e)
- 角色提示优化 (4eafc4d)
- 故事场景模式优化 (dc90986)
- 修复重试时立即报超时的问题 (1f2df99)
- 优化下载逻辑，优先使用本地缓存并增加重试机制 (0c03c5d)

### 🔧 Chores

- 同步 package-lock.json 添加 @tanstack/react-virtual (69fe1d5)
- 添加 pnpm-lock.yaml 修复 Netlify 构建 (c74f2ed)
- refactor(character): 代码质量优化 (3918571)
- 不同模型 @ 显示区分 (6e1d8be)
- 优化图标 (5c82e04)

### ❤️  Thank You

- gongchengtu <1817063960@qq.com>
- liquidliang <ljquan@qq.com>

## 0.3.2 (2025-12-23)

### 🔧 Chores

- 添加域名处理 (b227909)
- v0.3.1 (0f639c3)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.3.1 (2025-12-23)

### 🚀 Features

- 优化AI图片和AI视频图标样式 (237695f)
- 优化工具栏图标布局和AI图标样式 (00392d4)
- 优化按钮布局 close #42 (80ed227)
- 将模式切换按钮移至 WinBox 标题栏 (4c8617b)
- 添加新 VIP 图片模型并优化模型选择器 (64ca946)
- 优化表格交互体验 (093681e)
- 生成中状态显示在已完成图片后面 (3a81415)
- 智能下载功能（单张直接下载，多张打包zip） (5ba9ab7)
- 添加图片预览导航和生成警告功能 (b02f181)
- 添加模式记忆功能 (05a16ff)
- 改进错误信息显示 (a3d4d41)
- 添加本地缓存和修复光标位置 (ab2cba7)
- 改进单元格交互体验 (f8a88e5)
- 改进数量单元格的交互体验 (5e86ff4)
- 切换到批量模式时自动最大化窗口 (6dc6283)
- 改进添加行UI和下载模板功能 (4f9e2b8)
- 添加图片预览放大、批量下载和模型选择功能 (ab23c7d)
- 添加 Excel 导入导出功能 (7afe54b)
- 支持选择批量导入的起始行 (c322a95)
- 添加批量上传导入表格功能 (59d0c81)
- 添加复选框列用于行选择 (b373b8f)
- 添加预览列、选择功能和仅生成选中行 (efb9253)
- 将批量出图集成到 AI 图片生成对话框 (51a8141)
- 重构批量任务提交逻辑，添加批次参数避免重复检测 (9885195)
- 增强批量出图功能 (c608c09)
- 添加批量出图工具及图片库功能 (5b943db)

### 🩹 Fixes

- 修复批量生成预览图首次加载损坏问题 (1ba7a93)
- 修复无API Key时批量生成弹出多个弹窗问题 (0613708)
- 修复填充柄与选择拖拽冲突问题 (f128f28)
- 优化画廊和下载功能 (af0e7d9)
- 修复带内容进入时自动放大问题 (d60a25d)
- 修复多项交互问题 (c94283b)
- 修复单元格选择和复制粘贴功能 (faa24b9)
- 点击失败行预览单元格时选中行复选框 (382e94b)
- 统一错误显示格式与任务队列一致 (f2c1732)
- 修复编辑模式下单击退出编辑的问题 (796c5ec)
- 修正单元格交互为Excel风格 (335cbb9)
- 添加 globalIndex 确保每个子任务哈希唯一 (ed6c92b)

### 🔧 Chores

- 优化z-index (94e887d)
- style(batch-image): 将批量出图按钮改为文字链接样式 (43e9871)
- refactor(batch-image): 移除状态、预览、操作列，简化为纯提交工具 (735e736)

### ❤️  Thank You

- gongchengtu <1817063960@qq.com>
- liquidliang <ljquan@qq.com>
- likeusewin10 <1375280732@qq.com>

## 0.3.0 (2025-12-16)

### 🩹 Fixes

- 添加 .npmrc 解决 CI 依赖安装冲突 (0b8f8e1)
- 修复winbox 中任务显示不正常 (3f16f13)

### 🔧 Chores

- 指示小优化 (d90971f)
- 素材库位置优化 (5e2e0ea)
- 工具箱优化 (794ca89)
- 更换chat生图接口为 image接口、修复素材库边距 (4757992)
- 优化教程 (f927878)

### ❤️  Thank You

- gongchengtu <1817063960@qq.com>
- liquid <ljquan@qq.com>

## 0.2.15 (2025-12-13)

### 🚀 Features

- 素材库批量删除支持 (5440dae)
- 素材库初版实现 (9acfaa4)
- 实现多功能工具箱系统 (2ece4c6)
- 优化工具栏和AI生成功能 (51e6f5c)
- 优化项目抽屉UI和图标设计 (615f4f6)
- workspace项目管理系统及首次访问默认数据 (a6d6a84)

### 🩹 Fixes

- 素材库移动端优化 (cad4025)
- 素材填入优化 (6dfbe94)
- 视频加载修复 (9e7a5f7)
- 素材库样式修复 (34b36a5)
- 修复视频模型切换参数同步问题 (53a653e)

### 🔧 Chores

- bump version to 0.2.14 (66e8bba)
- 优化交互 (a961727)
- 优化缩放 (c605f5a)
- 优化工具 (62d7d76)
- docs: 添加openspec (663998f)
- docs(009-media-library): 添加媒体库功能规划文档 (9c6c35a)
- refactor(analytics): 将 Umami 分析替换为 PostHog (c0b7069)

### ❤️  Thank You

- liquid <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>
- liquidliang <ljquan@qq.com>

## 0.2.14 (2025-12-10)

### 🚀 Features

- 优化工具栏和AI生成功能 (51e6f5c)
- 优化项目抽屉UI和图标设计 (615f4f6)
- workspace项目管理系统及首次访问默认数据 (a6d6a84)

### 🩹 Fixes

- 修复视频模型切换参数同步问题 (53a653e)

### 🔧 Chores

- refactor(analytics): 将 Umami 分析替换为 PostHog (c0b7069)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.2.13 (2025-12-06)

### 🚀 Features

- 实现智能升级机制,避免中断用户活跃请求 (484797a)

### 🔧 Chores

- refactor(dialog): 重构AI生成对话框为任务列表驱动的工作流 (3612715)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.2.12 (2025-12-06)

### 🩹 Fixes

- 优化静态资源缓存策略并修复HTML版本问题 (6550953)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.2.11 (2025-12-05)

### 🔧 Chores

- 优化升级逻辑 (d03710d)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.2.10 (2025-12-05)

### 🔧 Chores

- 修复bug (8e055a8)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.2.9 (2025-12-05)

### 🚀 Features

- 统一应用版本管理并添加全局版本变量 (b57d947)
- add declarative tracking specification and task breakdown (53f18c7)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>

## 0.2.8 (2025-12-05)

### 🚀 Features

- 添加聊天模型选择器组件 (289857a)
- 添加文本对话抽屉 (8ad019e)
- 优化布局 #12 (28d2ee3)

### 🩹 Fixes

- 修复WinBox内容挂载导致的DOM节点引用错误 (22c6c3d)
- 修复对话抽屉API key检查和弹窗层级问题 (06cf9d5)
- 修复统一工具栏与任务按钮位置冲突 (88f2c4c)
- 修复视频插入画板后不显示的问题 (91bdfa4)
- 优化缓存机制、工具栏交互和AI图片生成功能 (b606db4)

### 🔧 Chores

- bump version to 0.2.7 (8f926c5)
- bump version to 0.2.6 (4774a24)
- 优化样式 (d12681d)
- 优化颜色 (b94d6ab)
- 优化示例 (964a8a8)
- 优化构建 (b0d9653)
- 优化build (152b9ca)
- 添加type (966ce2e)
- 调整层级 (57b4a98)
- 布局优化2 (a8a9faa)
- 布局优化1 (ecf8d8d)
- 提高超时时间 (620d5c2)
- 优化上报&弹窗 (211fc9f)
- docs: 完善项目文档和工具链 (4dae671)
- 添加filesystem兜底 (622ce19)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>

## 0.2.7 (2025-12-04)

### 🚀 Features

- 添加聊天模型选择器组件 (289857a)
- 添加文本对话抽屉 (8ad019e)
- 优化布局 #12 (28d2ee3)

### 🩹 Fixes

- 修复对话抽屉API key检查和弹窗层级问题 (06cf9d5)
- 修复统一工具栏与任务按钮位置冲突 (88f2c4c)
- 修复视频插入画板后不显示的问题 (91bdfa4)
- 优化缓存机制、工具栏交互和AI图片生成功能 (b606db4)

### 🔧 Chores

- bump version to 0.2.6 (4774a24)
- 布局优化2 (a8a9faa)
- 布局优化1 (ecf8d8d)
- 提高超时时间 (620d5c2)
- docs: 完善项目文档和工具链 (4dae671)
- 添加filesystem兜底 (622ce19)

### ❤️  Thank You

- gongchengtu <1817063960@qq.com>
- liquidliang <ljquan@qq.com>
- liquid <ljquan@qq.com>

## 0.2.6 (2025-12-02)

### 🚀 Features

- 优化布局 #12 (28d2ee3)

### 🩹 Fixes

- 修复视频插入画板后不显示的问题 (91bdfa4)
- 优化缓存机制、工具栏交互和AI图片生成功能 (b606db4)

### 🔧 Chores

- bump version to 0.2.4 (bb46198)
- 添加filesystem兜底 (622ce19)
- 优化缓存 (72ca629)

### ❤️  Thank You

- liquidliang <ljquan@qq.com>
- gongchengtu <1817063960@qq.com>
- liquid <ljquan@qq.com>

## 0.2.4 (2025-11-30)

### 🔧 Chores

- 优化缓存 (72ca629)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.2.3 (2025-11-30)

### 🔧 Chores

- 添加图片加载的重试组件 (f365f84)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.2.2 (2025-11-30)

### 🔧 Chores

- choice: 优化changelog (9b47e75)
- 优化缓存和版本管理 (cde96d4)

### ❤️  Thank You

- liquid <ljquan@qq.com>

## 0.2.1 (2025-08-06)


### 🩹 Fixes

- **hotkey:** assign t as hotkey to create text element ([#192](https://github.com/plait-board/drawnix/pull/192))

### ❤️  Thank You

- pubuzhixing8 @pubuzhixing8

## 0.2.0 (2025-08-06)

This was a version bump only, there were no code changes.

## 0.1.4 (2025-08-06)

This was a version bump only, there were no code changes.

## 0.1.3 (2025-08-06)


### 🩹 Fixes

- **hotkey:** prevent hotkey when  type normally ([#189](https://github.com/plait-board/drawnix/pull/189))

### ❤️  Thank You

- pubuzhixing8 @pubuzhixing8

## 0.1.2 (2025-08-06)


### 🚀 Features

- **creation:** support creation mode hotkey #183 ([#185](https://github.com/plait-board/drawnix/pull/185), [#183](https://github.com/plait-board/drawnix/issues/183))
- **mind:** bump plait into 0.82.0 to improve the experience of mind ([f904594](https://github.com/plait-board/drawnix/commit/f904594))
- **viewer:** support image which in mind node view #125 ([#125](https://github.com/plait-board/drawnix/issues/125))

### ❤️  Thank You

- pubuzhixing8 @pubuzhixing8

## 0.1.1 (2025-07-10)


### 🩹 Fixes

- **text:** resolve text can not auto break line #173 #169 ([#173](https://github.com/plait-board/drawnix/issues/173), [#169](https://github.com/plait-board/drawnix/issues/169))

### ❤️  Thank You

- pubuzhixing8 @pubuzhixing8

## 0.1.0 (2025-07-02)


### 🚀 Features

- import styles ([ecfe3cd](https://github.com/plait-board/drawnix/commit/ecfe3cd))
- add script and update ci ([147c028](https://github.com/plait-board/drawnix/commit/147c028))
- bump plait into 0.62.0-next.7 ([7ab4003](https://github.com/plait-board/drawnix/commit/7ab4003))
- add main menu ([#14](https://github.com/plait-board/drawnix/pull/14))
- improve active-toolbar ([fd19725](https://github.com/plait-board/drawnix/commit/fd19725))
- rename active-toolbar to popup-toolbar and modify tool-button ([aa06c7e](https://github.com/plait-board/drawnix/commit/aa06c7e))
- support opacity for  color property ([#16](https://github.com/plait-board/drawnix/pull/16))
- support local storage ([9c0e652](https://github.com/plait-board/drawnix/commit/9c0e652))
- add product_showcase bump plait into 0.69.0 ([61fe571](https://github.com/plait-board/drawnix/commit/61fe571))
- add sitemap ([3b9d9a3](https://github.com/plait-board/drawnix/commit/3b9d9a3))
- improve pinch zoom ([#77](https://github.com/plait-board/drawnix/pull/77))
- bump plait into 0.76.0 and handle break changes ([#90](https://github.com/plait-board/drawnix/pull/90))
- improve README ([9e0190d](https://github.com/plait-board/drawnix/commit/9e0190d))
- add dependencies for packages ([6d89b32](https://github.com/plait-board/drawnix/commit/6d89b32))
- init dialog and mermaid-to-dialog ([6ff70b9](https://github.com/plait-board/drawnix/commit/6ff70b9))
- support save as json from hotkey ([120dffa](https://github.com/plait-board/drawnix/commit/120dffa))
- support sub menu and export jpg ([#132](https://github.com/plait-board/drawnix/pull/132))
- improve link popup state ([#147](https://github.com/plait-board/drawnix/pull/147))
- improve seo ([#148](https://github.com/plait-board/drawnix/pull/148))
- **active-toolbar:** add active toolbar ([7e737a2](https://github.com/plait-board/drawnix/commit/7e737a2))
- **active-toolbar:** support font color property ([4b2d964](https://github.com/plait-board/drawnix/commit/4b2d964))
- **app:** use localforage to storage main board content #122 ([#122](https://github.com/plait-board/drawnix/issues/122))
- **app-toolbar:** support undo/redo operation ([50f8831](https://github.com/plait-board/drawnix/commit/50f8831))
- **app-toolbar:** add trash and duplicate in app-toolbar ([#28](https://github.com/plait-board/drawnix/pull/28))
- **clean-board:** complete clean board ([#124](https://github.com/plait-board/drawnix/pull/124))
- **clean-confirm:** autoFocus ok button ([582172a](https://github.com/plait-board/drawnix/commit/582172a))
- **color-picker:** support merge operations for update opacity #4 ([#45](https://github.com/plait-board/drawnix/pull/45), [#4](https://github.com/plait-board/drawnix/issues/4))
- **component:** improve the onXXXChange feature for drawnix component #79 ([#79](https://github.com/plait-board/drawnix/issues/79))
- **component:** add afterInit to expose board instance ([23d91dc](https://github.com/plait-board/drawnix/commit/23d91dc))
- **component:** support update value from drawnix component outside ([#103](https://github.com/plait-board/drawnix/pull/103))
- **component:** fit viewport after children updated ([#104](https://github.com/plait-board/drawnix/pull/104))
- **creation-toolbar:** support long-press triggers drag selection an… ([#78](https://github.com/plait-board/drawnix/pull/78))
- **creation-toolbar:** remove default action when click shape and arrow icon in creation toolbar improve tool-button ([a46c2df](https://github.com/plait-board/drawnix/commit/a46c2df))
- **draw:** bump plait into 0.75.0-next.0 and support fine-grained selection ([#69](https://github.com/plait-board/drawnix/pull/69))
- **draw-toolbar:** add draw toolbar ([#9](https://github.com/plait-board/drawnix/pull/9))
- **draw-toolbar:** add shape and arrow panel for draw-toolbar #10 ([#12](https://github.com/plait-board/drawnix/pull/12), [#10](https://github.com/plait-board/drawnix/issues/10))
- **drawnix:** init drawnix package ([397d865](https://github.com/plait-board/drawnix/commit/397d865))
- **drawnix:** export utils ([#105](https://github.com/plait-board/drawnix/pull/105))
- **drawnix-board:** initialize drawnix board ([117e5a8](https://github.com/plait-board/drawnix/commit/117e5a8))
- **fill:** split fill color and fill opacity setting ([#53](https://github.com/plait-board/drawnix/pull/53))
- **flowchart:** add terminal shape element ([#80](https://github.com/plait-board/drawnix/pull/80))
- **freehand:** initialize freehand #2 ([#2](https://github.com/plait-board/drawnix/issues/2))
- **freehand:** apply gaussianSmooth to freehand curve ([#47](https://github.com/plait-board/drawnix/pull/47))
- **freehand:** update stroke width to 2 and optimize freehand end points ([#50](https://github.com/plait-board/drawnix/pull/50))
- **freehand:** improve freehand experience ([#51](https://github.com/plait-board/drawnix/pull/51))
- **freehand:** add FreehandSmoother to optimize freehand curve ([#62](https://github.com/plait-board/drawnix/pull/62))
- **freehand:** optimize freehand curve by stylus features ([#63](https://github.com/plait-board/drawnix/pull/63))
- **freehand:** freehand support theme ([b7c7965](https://github.com/plait-board/drawnix/commit/b7c7965))
- **freehand:** support closed freehand and add popup for freehand ([#68](https://github.com/plait-board/drawnix/pull/68))
- **freehand:** bump plait into 0.75.0-next.9 and resolve freehand unexpected resize-handle after moving freehand elements ([#84](https://github.com/plait-board/drawnix/pull/84))
- **hotkey:** support export png hotkey ([#30](https://github.com/plait-board/drawnix/pull/30))
- **image:** support free image element and support insert image at m… ([#95](https://github.com/plait-board/drawnix/pull/95))
- **image:** should hide popup toolbar when selected element include image ([#96](https://github.com/plait-board/drawnix/pull/96))
- **image:** support drag image to board to add image as draw element or mind node image ([#144](https://github.com/plait-board/drawnix/pull/144))
- **link:** improve link popup ([eba06e2](https://github.com/plait-board/drawnix/commit/eba06e2))
- **markdown-to-drawnix:** support markdown to drawnix mind map #134 ([#135](https://github.com/plait-board/drawnix/pull/135), [#134](https://github.com/plait-board/drawnix/issues/134))
- **menu:** support export to json file ([d0d6ca5](https://github.com/plait-board/drawnix/commit/d0d6ca5))
- **menu:** support load file action ([758aa6d](https://github.com/plait-board/drawnix/commit/758aa6d))
- **mermaid:** improve mermaid-to-drawnix ([a928ba1](https://github.com/plait-board/drawnix/commit/a928ba1))
- **mobile:** adapt mobile device ([7c0742f](https://github.com/plait-board/drawnix/commit/7c0742f))
- **pencil-mode:** add pencil mode and add drawnix context ([#76](https://github.com/plait-board/drawnix/pull/76))
- **pinch-zoom:** support pinch zoom for touch device ([#60](https://github.com/plait-board/drawnix/pull/60))
- **pinch-zoom:** improve pinch zoom functionality and support hand moving ([#75](https://github.com/plait-board/drawnix/pull/75))
- **popover:** add reusable popover and replace radix popover ([d30388a](https://github.com/plait-board/drawnix/commit/d30388a))
- **popup:** display icon when color is complete opacity ([#42](https://github.com/plait-board/drawnix/pull/42))
- **popup-toolbar:** support set branch color remove color property when select transparent #17 ([#17](https://github.com/plait-board/drawnix/issues/17))
- **popup-toolbar:** bump plait into 0.71.0 and mind node link stroke and node stroke support dashed/dotted style #22 ([#22](https://github.com/plait-board/drawnix/issues/22))
- **property:** support stroke style setting ([463c92a](https://github.com/plait-board/drawnix/commit/463c92a))
- **size-slider:** improve size-slider component ([780be9d](https://github.com/plait-board/drawnix/commit/780be9d))
- **text:** support soft break ([#39](https://github.com/plait-board/drawnix/pull/39))
- **text:** support update text from outside ([#58](https://github.com/plait-board/drawnix/pull/58))
- **text:** support insertSoftBreak for text #136 ([#136](https://github.com/plait-board/drawnix/issues/136))
- **theme-toolbar:** add theme selection toolbar for customizable themes ([dca0e33](https://github.com/plait-board/drawnix/commit/dca0e33))
- **toolbar:** support zoom toolbar ([76ef5d9](https://github.com/plait-board/drawnix/commit/76ef5d9))
- **web:** seo ([84cde4b](https://github.com/plait-board/drawnix/commit/84cde4b))
- **web:** add cloud.umami.is to track views ([#64](https://github.com/plait-board/drawnix/pull/64))
- **web:** modify initialize-data for adding freehand data ([#65](https://github.com/plait-board/drawnix/pull/65))
- **web:** add debug console ([#83](https://github.com/plait-board/drawnix/pull/83))
- **wrapper:** add wrapper component and context hook ([#6](https://github.com/plait-board/drawnix/pull/6))
- **zoom-toolbar:** support zoom menu ([cc6a6b8](https://github.com/plait-board/drawnix/commit/cc6a6b8))

### 🩹 Fixes

- remove theme-toolbar font-weight style ([#67](https://github.com/plait-board/drawnix/pull/67))
- revert package lock ([1aa9d42](https://github.com/plait-board/drawnix/commit/1aa9d42))
- fix pub issue ([156abcb](https://github.com/plait-board/drawnix/commit/156abcb))
- improve libs build ([9ddb6d9](https://github.com/plait-board/drawnix/commit/9ddb6d9))
- **app-toolbar:** correct app-toolbar style ([#106](https://github.com/plait-board/drawnix/pull/106))
- **arrow-line:** optimize the popup toolbar position when selected element is arrow line ([#70](https://github.com/plait-board/drawnix/pull/70))
- **board:** resolve mobile scrolling issue when resize or moving ([8fdca8e](https://github.com/plait-board/drawnix/commit/8fdca8e))
- **board:** bump plait into 0.69.1 deselect when text editing end refactor popup toolbar placement ([aef6d23](https://github.com/plait-board/drawnix/commit/aef6d23))
- **board:** use updateViewBox to fix board wobbles when dragging or resizing ([#94](https://github.com/plait-board/drawnix/pull/94))
- **color-picker:** support display 0 opacity ([#48](https://github.com/plait-board/drawnix/pull/48))
- **core:** bump plait into 0.79.1 to fix with-hand issue when press space key #141 ([#149](https://github.com/plait-board/drawnix/pull/149), [#141](https://github.com/plait-board/drawnix/issues/141))
- **creation-toolbar:** use pointerUp set basic pointer cause onChange do not fire on mobile bind pointermove/pointerup to viewportContainerRef to implement dnd on mobile #20 ([#20](https://github.com/plait-board/drawnix/issues/20))
- **creation-toolbar:** move out toolbar from board to avoid fired pointer down event when operating ([ddb6092](https://github.com/plait-board/drawnix/commit/ddb6092))
- **font-color:** fix color can not be assigned when current color is empty ([#55](https://github.com/plait-board/drawnix/pull/55))
- **freehand:** fix freehand creation issue(caused by throttleRAF) ([#40](https://github.com/plait-board/drawnix/pull/40))
- **mermaid:** bump mermaid-to-drawnix to 0.0.2 to fix text display issue ([33878d0](https://github.com/plait-board/drawnix/commit/33878d0))
- **mermaid-to-drawnix:** support group for insertToBoard ([e2f5056](https://github.com/plait-board/drawnix/commit/e2f5056))
- **mind:** remove branchColor property setting ([#46](https://github.com/plait-board/drawnix/pull/46))
- **property:** prevent set fill color opacity when color is none ([#56](https://github.com/plait-board/drawnix/pull/56))
- **react-board:** resolve text should not display in safari ([19fc20f](https://github.com/plait-board/drawnix/commit/19fc20f))
- **react-board:** support fit viewport after browser window resized ([96f4a0e](https://github.com/plait-board/drawnix/commit/96f4a0e))
- **size-slider:** correct size slider click handle can not fire ([#57](https://github.com/plait-board/drawnix/pull/57))
- **text:** fix composition input and abc input trembly issue ([#15](https://github.com/plait-board/drawnix/pull/15))
- **text:** resolve with-text build error ([#41](https://github.com/plait-board/drawnix/pull/41))
- **text:** fix text can not editing ([#52](https://github.com/plait-board/drawnix/pull/52))
- **text:** fix text can not display correctly on windows 10 chrome env #99 ([#100](https://github.com/plait-board/drawnix/pull/100), [#99](https://github.com/plait-board/drawnix/issues/99))
- **text:** allow scroll to show all text ([#156](https://github.com/plait-board/drawnix/pull/156))
- **text:** set whiteSpace: pre to avoid \n is ineffectual ([#165](https://github.com/plait-board/drawnix/pull/165))
- **use-board-event:** fix board event timing ([0d4a8f1](https://github.com/plait-board/drawnix/commit/0d4a8f1))

### ❤️  Thank You

- pubuzhixing8 @pubuzhixing8

## 0.0.4 (2025-04-15)


### 🚀 Features

- ci: a tiny docker image (#127) ([#122](https://github.com/plait-board/drawnix/pull/127))
- support save as json from hotkey ([120dffa](https://github.com/plait-board/drawnix/commit/120dffa))
- **app:** use localforage to storage main board content #122 ([#122](https://github.com/plait-board/drawnix/issues/122))
- **clean-board:** complete clean board ([#124](https://github.com/plait-board/drawnix/pull/124))

### 🩹 Fixes

- **react-board:** support fit viewport after browser window resized ([96f4a0e](https://github.com/plait-board/drawnix/commit/96f4a0e))

### ❤️  Thank You

- lurenyang418 @lurenyang418
- whyour @whyour
- pubuzhixing8 @pubuzhixing8

## 0.0.4-3 (2025-03-25)


### 🩹 Fixes

- improve libs build ([9ddb6d9](https://github.com/plait-board/drawnix/commit/9ddb6d9))
- **mermaid:** bump mermaid-to-drawnix to 0.0.2 to fix text display issue ([33878d0](https://github.com/plait-board/drawnix/commit/33878d0))

### ❤️  Thank You

- pubuzhixing8

## 0.0.4-2 (2025-03-19)


### 🚀 Features

- init dialog and mermaid-to-dialog ([6ff70b9](https://github.com/plait-board/drawnix/commit/6ff70b9))
- **mermaid:** improve mermaid-to-drawnix ([a928ba1](https://github.com/plait-board/drawnix/commit/a928ba1))

### ❤️  Thank You

- pubuzhixing8 @pubuzhixing8

## 0.0.4-1 (2025-03-16)

This was a version bump only, there were no code changes.

## 0.0.4-0 (2025-03-16)


### 🚀 Features

- add dependencies for packages ([6d89b32](https://github.com/plait-board/drawnix/commit/6d89b32))
- **component:** support update value from drawnix component outside ([#103](https://github.com/plait-board/drawnix/pull/103))
- **component:** fit viewport after children updated ([#104](https://github.com/plait-board/drawnix/pull/104))
- **drawnix:** export utils ([#105](https://github.com/plait-board/drawnix/pull/105))

### 🩹 Fixes

- **app-toolbar:** correct app-toolbar style ([#106](https://github.com/plait-board/drawnix/pull/106))

### ❤️  Thank You

- pubuzhixing8 @pubuzhixing8

## 0.0.3 (2025-03-14)


### 🩹 Fixes

- revert package lock ([1aa9d42](https://github.com/plait-board/drawnix/commit/1aa9d42))
- fix pub issue ([156abcb](https://github.com/plait-board/drawnix/commit/156abcb))
- **text:** fix text can not display correctly on windows 10 chrome env #99 ([#100](https://github.com/plait-board/drawnix/pull/100), [#99](https://github.com/plait-board/drawnix/issues/99))

### ❤️  Thank You

- pubuzhixing8 @pubuzhixing8

## 0.0.2 (2025-03-10)


### 🚀 Features

- improve README ([9e0190d](https://github.com/plait-board/drawnix/commit/9e0190d))

### ❤️  Thank You

- pubuzhixing8 @pubuzhixing8

## 0.0.1 (2025-03-10)


### 🚀 Features

- import styles ([ecfe3cd](https://github.com/plait-board/drawnix/commit/ecfe3cd))
- add script and update ci ([147c028](https://github.com/plait-board/drawnix/commit/147c028))
- bump plait into 0.62.0-next.7 ([7ab4003](https://github.com/plait-board/drawnix/commit/7ab4003))
- add main menu ([#14](https://github.com/plait-board/drawnix/pull/14))
- improve active-toolbar ([fd19725](https://github.com/plait-board/drawnix/commit/fd19725))
- rename active-toolbar to popup-toolbar and modify tool-button ([aa06c7e](https://github.com/plait-board/drawnix/commit/aa06c7e))
- support opacity for  color property ([#16](https://github.com/plait-board/drawnix/pull/16))
- support local storage ([9c0e652](https://github.com/plait-board/drawnix/commit/9c0e652))
- add product_showcase bump plait into 0.69.0 ([61fe571](https://github.com/plait-board/drawnix/commit/61fe571))
- add sitemap ([3b9d9a3](https://github.com/plait-board/drawnix/commit/3b9d9a3))
- improve pinch zoom ([#77](https://github.com/plait-board/drawnix/pull/77))
- bump plait into 0.76.0 and handle break changes ([#90](https://github.com/plait-board/drawnix/pull/90))
- **active-toolbar:** add active toolbar ([7e737a2](https://github.com/plait-board/drawnix/commit/7e737a2))
- **active-toolbar:** support font color property ([4b2d964](https://github.com/plait-board/drawnix/commit/4b2d964))
- **app-toolbar:** support undo/redo operation ([50f8831](https://github.com/plait-board/drawnix/commit/50f8831))
- **app-toolbar:** add trash and duplicate in app-toolbar ([#28](https://github.com/plait-board/drawnix/pull/28))
- **color-picker:** support merge operations for update opacity #4 ([#45](https://github.com/plait-board/drawnix/pull/45), [#4](https://github.com/plait-board/drawnix/issues/4))
- **component:** improve the onXXXChange feature for drawnix component #79 ([#79](https://github.com/plait-board/drawnix/issues/79))
- **component:** add afterInit to expose board instance ([23d91dc](https://github.com/plait-board/drawnix/commit/23d91dc))
- **creation-toolbar:** support long-press triggers drag selection an… ([#78](https://github.com/plait-board/drawnix/pull/78))
- **draw:** bump plait into 0.75.0-next.0 and support fine-grained selection ([#69](https://github.com/plait-board/drawnix/pull/69))
- **draw-toolbar:** add draw toolbar ([#9](https://github.com/plait-board/drawnix/pull/9))
- **draw-toolbar:** add shape and arrow panel for draw-toolbar #10 ([#12](https://github.com/plait-board/drawnix/pull/12), [#10](https://github.com/plait-board/drawnix/issues/10))
- **drawnix:** init drawnix package ([397d865](https://github.com/plait-board/drawnix/commit/397d865))
- **drawnix-board:** initialize drawnix board ([117e5a8](https://github.com/plait-board/drawnix/commit/117e5a8))
- **fill:** split fill color and fill opacity setting ([#53](https://github.com/plait-board/drawnix/pull/53))
- **flowchart:** add terminal shape element ([#80](https://github.com/plait-board/drawnix/pull/80))
- **freehand:** initialize freehand #2 ([#2](https://github.com/plait-board/drawnix/issues/2))
- **freehand:** apply gaussianSmooth to freehand curve ([#47](https://github.com/plait-board/drawnix/pull/47))
- **freehand:** update stroke width to 2 and optimize freehand end points ([#50](https://github.com/plait-board/drawnix/pull/50))
- **freehand:** improve freehand experience ([#51](https://github.com/plait-board/drawnix/pull/51))
- **freehand:** add FreehandSmoother to optimize freehand curve ([#62](https://github.com/plait-board/drawnix/pull/62))
- **freehand:** optimize freehand curve by stylus features ([#63](https://github.com/plait-board/drawnix/pull/63))
- **freehand:** freehand support theme ([b7c7965](https://github.com/plait-board/drawnix/commit/b7c7965))
- **freehand:** support closed freehand and add popup for freehand ([#68](https://github.com/plait-board/drawnix/pull/68))
- **freehand:** bump plait into 0.75.0-next.9 and resolve freehand unexpected resize-handle after moving freehand elements ([#84](https://github.com/plait-board/drawnix/pull/84))
- **hotkey:** support export png hotkey ([#30](https://github.com/plait-board/drawnix/pull/30))
- **image:** support free image element and support insert image at m… ([#95](https://github.com/plait-board/drawnix/pull/95))
- **image:** should hide popup toolbar when selected element include image ([#96](https://github.com/plait-board/drawnix/pull/96))
- **menu:** support export to json file ([d0d6ca5](https://github.com/plait-board/drawnix/commit/d0d6ca5))
- **menu:** support load file action ([758aa6d](https://github.com/plait-board/drawnix/commit/758aa6d))
- **mobile:** adapt mobile device ([7c0742f](https://github.com/plait-board/drawnix/commit/7c0742f))
- **pencil-mode:** add pencil mode and add drawnix context ([#76](https://github.com/plait-board/drawnix/pull/76))
- **pinch-zoom:** support pinch zoom for touch device ([#60](https://github.com/plait-board/drawnix/pull/60))
- **pinch-zoom:** improve pinch zoom functionality and support hand moving ([#75](https://github.com/plait-board/drawnix/pull/75))
- **popover:** add reusable popover and replace radix popover ([d30388a](https://github.com/plait-board/drawnix/commit/d30388a))
- **popup:** display icon when color is complete opacity ([#42](https://github.com/plait-board/drawnix/pull/42))
- **popup-toolbar:** support set branch color remove color property when select transparent #17 ([#17](https://github.com/plait-board/drawnix/issues/17))
- **popup-toolbar:** bump plait into 0.71.0 and mind node link stroke and node stroke support dashed/dotted style #22 ([#22](https://github.com/plait-board/drawnix/issues/22))
- **property:** support stroke style setting ([463c92a](https://github.com/plait-board/drawnix/commit/463c92a))
- **size-slider:** improve size-slider component ([780be9d](https://github.com/plait-board/drawnix/commit/780be9d))
- **text:** support soft break ([#39](https://github.com/plait-board/drawnix/pull/39))
- **text:** support update text from outside ([#58](https://github.com/plait-board/drawnix/pull/58))
- **theme-toolbar:** add theme selection toolbar for customizable themes ([dca0e33](https://github.com/plait-board/drawnix/commit/dca0e33))
- **toolbar:** support zoom toolbar ([76ef5d9](https://github.com/plait-board/drawnix/commit/76ef5d9))
- **web:** seo ([84cde4b](https://github.com/plait-board/drawnix/commit/84cde4b))
- **web:** add cloud.umami.is to track views ([#64](https://github.com/plait-board/drawnix/pull/64))
- **web:** modify initialize-data for adding freehand data ([#65](https://github.com/plait-board/drawnix/pull/65))
- **web:** add debug console ([#83](https://github.com/plait-board/drawnix/pull/83))
- **wrapper:** add wrapper component and context hook ([#6](https://github.com/plait-board/drawnix/pull/6))
- **zoom-toolbar:** support zoom menu ([cc6a6b8](https://github.com/plait-board/drawnix/commit/cc6a6b8))

### 🩹 Fixes

- remove theme-toolbar font-weight style ([#67](https://github.com/plait-board/drawnix/pull/67))
- **arrow-line:** optimize the popup toolbar position when selected element is arrow line ([#70](https://github.com/plait-board/drawnix/pull/70))
- **board:** resolve mobile scrolling issue when resize or moving ([8fdca8e](https://github.com/plait-board/drawnix/commit/8fdca8e))
- **board:** bump plait into 0.69.1 deselect when text editing end refactor popup toolbar placement ([aef6d23](https://github.com/plait-board/drawnix/commit/aef6d23))
- **board:** use updateViewBox to fix board wobbles when dragging or resizing ([#94](https://github.com/plait-board/drawnix/pull/94))
- **color-picker:** support display 0 opacity ([#48](https://github.com/plait-board/drawnix/pull/48))
- **creation-toolbar:** use pointerUp set basic pointer cause onChange do not fire on mobile bind pointermove/pointerup to viewportContainerRef to implement dnd on mobile #20 ([#20](https://github.com/plait-board/drawnix/issues/20))
- **creation-toolbar:** move out toolbar from board to avoid fired pointer down event when operating ([ddb6092](https://github.com/plait-board/drawnix/commit/ddb6092))
- **font-color:** fix color can not be assigned when current color is empty ([#55](https://github.com/plait-board/drawnix/pull/55))
- **freehand:** fix freehand creation issue(caused by throttleRAF) ([#40](https://github.com/plait-board/drawnix/pull/40))
- **mind:** remove branchColor property setting ([#46](https://github.com/plait-board/drawnix/pull/46))
- **property:** prevent set fill color opacity when color is none ([#56](https://github.com/plait-board/drawnix/pull/56))
- **react-board:** resolve text should not display in safari ([19fc20f](https://github.com/plait-board/drawnix/commit/19fc20f))
- **size-slider:** correct size slider click handle can not fire ([#57](https://github.com/plait-board/drawnix/pull/57))
- **text:** fix composition input and abc input trembly issue ([#15](https://github.com/plait-board/drawnix/pull/15))
- **text:** resolve with-text build error ([#41](https://github.com/plait-board/drawnix/pull/41))
- **text:** fix text can not editing ([#52](https://github.com/plait-board/drawnix/pull/52))
- **use-board-event:** fix board event timing ([0d4a8f1](https://github.com/plait-board/drawnix/commit/0d4a8f1))

### ❤️  Thank You

- pubuzhixing8 @pubuzhixing8