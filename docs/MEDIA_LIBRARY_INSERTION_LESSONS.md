# 素材库插入画布经验总结

这份文档沉淀 2026-04-22 这轮“素材库点击插入无响应”的排查与修复经验，重点不是复盘某一个按钮，而是明确一条规则：

- “打开素材库浏览”
- “打开素材库并选择后插入画布”

这两个动作在产品语义和代码语义上都不能混用。

## 一、问题现象

用户在画布页通过左侧工具栏或快捷工具栏打开素材库后，点击“插入”没有插入到画布，也没有明显反馈。

表面看像是“插入逻辑失效”，但真实原因是两层问题叠加：

- 工具栏入口想打开的是 `SELECT` 模式素材库
- 实际打开的是全局默认 `BROWSE` 模式素材库
- 即使走到 `onSelect`，素材库内部也没有等待异步插入完成，失败和卡顿都被伪装成“没反应”

## 二、根因

### 1. 全局素材库默认是 `BROWSE`，但画布入口需要 `SELECT`

画布页工具栏和快捷工具栏并不总是打开自身维护的 `MediaLibraryModal`，当父层传入 `onOpenMediaLibrary` 时，会改为打开 `drawnix.tsx` 里统一管理的全局素材库。

而全局素材库原来只接收：

- `isOpen`
- `onClose`

没有接收：

- `mode`
- `filterType`
- `onSelect`
- `selectButtonText`

结果就是：

- 入口想要“插入画布”
- 实际打开成了“浏览素材”
- 用户看见的是素材库开了，但插入语义丢了

经验：

- “统一弹窗管理”不能只统一开关状态
- 还必须统一携带“打开语义”
- 否则很容易出现入口 A 和入口 B 打开的是同一个弹窗壳，但行为完全不一致

### 2. 异步选择动作不能先关窗再说

原来的 `MediaLibraryModal` 在双击素材或点击“使用”按钮时是这样执行的：

- `onSelect(asset)`
- `onClose()`

这里最大的问题是 `onSelect` 允许异步，但弹窗不等待结果。

后果：

- 插入慢时，用户看到弹窗先消失，但画布没变化
- 插入失败时，错误反馈晚于关窗，用户会误以为“没点上”
- 如果中途 pending，很容易被误判成点击失效

经验：

- 只要动作会改动画布、网络、缓存、解码资源，就应视为异步事务
- 弹窗不能在事务开始后立刻关闭
- 必须等待完成，再关闭或给失败反馈

## 三、这次修法

### 1. 给全局素材库增加“打开配置”

这次把全局素材库状态从单纯的 `boolean` 扩成了“开关 + 配置”：

- `mode`
- `filterType`
- `onSelect`
- `selectButtonText`

这样不同入口可以明确表达自己的意图：

- 缓存清理入口：`BROWSE`
- 画布插入入口：`SELECT + onSelect`

经验：

- 全局弹窗状态不要只存 `visible`
- 还要存“这个弹窗是为谁、以什么模式打开的”

### 2. 工具栏入口显式传入 `SELECT`

画布左侧工具栏和快捷工具栏现在打开素材库时，会显式传：

- `mode: SelectionMode.SELECT`
- `onSelect: handleInsertAsset`
- `selectButtonText: '插入'`

这样不会再依赖全局默认值。

经验：

- 入口的行为语义，必须在入口处声明
- 不能靠下游组件默认值“猜”

### 3. 素材库等待插入完成后再关闭

`MediaLibraryModal` 里的双击和“使用”按钮，现在改成：

- 设置 `isSelecting`
- `await onSelect(asset)`
- 成功后再 `onClose()`

同时：

- “插入”按钮显示 loading
- loading 时禁止重复点击
- 卸载后通过 `isMountedRef` 防止无意义的状态回写

经验：

- 交互上要把“正在插入”显式呈现出来
- 这不仅是体验问题，也是排障问题
- 用户可见的 loading，本质上是运行时可观测性的一部分

## 四、这次沉淀出的规则

### 规则 1：弹窗统一管理时，必须保留入口语义

不要只抽象：

- `openXxxModal()`

要抽象成：

- `openXxxModal(config)`

至少要能带：

- 模式
- 回调
- 文案
- 筛选条件

### 规则 2：`BROWSE` 和 `SELECT` 是两种产品态，不是一个小参数

`BROWSE` 表示：

- 查看
- 管理
- 下载
- 删除

`SELECT` 表示：

- 选中后回传
- 触发上游业务动作
- 按上游场景展示按钮文案

经验：

- 如果一个组件同时承载两种态，就必须在类型和状态上明确区分
- 不能让调用方靠“有没有按钮”去推断当前模式

### 规则 3：任何“选择后执行动作”的弹窗，都要把异步状态做完整

至少包含：

- loading
- 防重复提交
- 成功后关闭
- 失败时保留现场

不要做成：

- 点一下就关
- 剩下靠日志和运气

### 规则 4：统一弹窗很方便，但默认值很危险

这次问题本质上就是：

- 统一弹窗没错
- 但把行为寄托在默认值上，导致入口语义丢失

经验：

- 越是“被多个入口复用”的弹窗，越不能依赖默认行为
- 默认值只能兜底，不能承载主流程

## 五、建议后续继续保持

- 新增全局弹窗时，优先设计 `open(config)` 而不是 `setVisible(true)`
- 只要弹窗里的主按钮会触发异步副作用，就必须带 loading
- 当一个入口的目标是“插入到画布”，要从入口到弹窗都显式传递这层语义，不要中途丢失
- 如果未来再拆工具栏或迁移弹窗管理层，优先回归测试“入口模式是否正确透传”

## 六、涉及文件

- `packages/drawnix/src/drawnix.tsx`
- `packages/drawnix/src/components/startup/DrawnixDeferredFeatures.tsx`
- `packages/drawnix/src/components/toolbar/creation-toolbar.tsx`
- `packages/drawnix/src/components/toolbar/quick-creation-toolbar/quick-creation-toolbar.tsx`
- `packages/drawnix/src/components/media-library/MediaLibraryModal.tsx`
- `packages/drawnix/src/components/media-library/MediaLibraryInspector.tsx`
- `packages/drawnix/src/components/toolbar/toolbar.types.ts`
- `packages/drawnix/src/types/asset.types.ts`

## 七、一句话结论

素材库“能打开”不等于“能插入”。  
对画布入口来说，真正重要的是：入口语义要带到弹窗里，异步插入要被用户看见。🎯
