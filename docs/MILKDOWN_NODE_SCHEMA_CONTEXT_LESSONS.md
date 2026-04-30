# Milkdown 自定义节点上下文经验

更新日期：2026-04-30

## 背景

知识库正文区域打开后白屏，控制台报错：

```text
MilkdownError: Context "nodes" not found, do you forget to inject it?
```

调用栈指向 `KnowledgeBaseContent` 打开知识库工具后的正文渲染链路。实际故障点不在知识库数据加载，而在 `MarkdownEditor` 挂载 Crepe/Milkdown 时注册自定义节点插件。

## 根因

Milkdown 的 `$nodeSchema()` 返回的是一组插件：

- `schema.ctx`：注入节点 schema factory 所需的上下文
- `schema.node`：读取 `schema.ctx`，再把节点写入 Milkdown 的 `nodesCtx`

因此如果手动拆开注册，顺序必须是：

```ts
schema.ctx,
schema.node,
view,
```

本次两个自定义插件曾写成 `node` 在 `ctx` 前：

- `markdownImageBlockSchema.node`
- `assetEmbedSchema.node`

当 Milkdown 初始化 schema 时，`node` 插件会先尝试读取尚未注入的 ctx，导致初始化链路异常；知识库正文默认开启 `enableAssetEmbeds`，因此会稳定走到这条路径。

## 修复思路

最小修复只调整插件注册顺序，不扩大重构：

```ts
export const markdownImageBlockPlugins = [
  markdownImageBlockSchema.ctx,
  markdownImageBlockSchema.node,
  markdownImageBlockView,
].flat();

export const assetEmbedPlugins = [
  remarkAssetEmbed,
  assetEmbedSchema.ctx,
  assetEmbedSchema.node,
  assetEmbedView,
].flat();
```

这样保持了现有 Markdown 图片和素材嵌入能力，不改变知识库编辑器的外部 API。

## 验证

本次做了三类轻量验证：

```bash
pnpm nx run drawnix:typecheck
```

- 类型检查通过
- 用 JSDOM 直接创建 Crepe + 自定义 `$nodeSchema` 插件，确认 `ctx -> node -> view` 顺序可正常初始化
- 在本地 `localhost:7200` 打开知识库，控制台未再出现 `Context "nodes"` 错误

`.npmrc` 中缺少 `NPM_TOKEN` 只会产生 pnpm warning，不影响类型检查结论。

## 经验

### 1. 不要随手拆散组合插件

Milkdown 的 `$nodeSchema()`、`$remark()` 这类 helper 通常返回带依赖顺序的插件组合。能整体 `.use(schema)` 时优先整体使用；必须拆开时，要确认每个子插件的上下文依赖。

### 2. 自定义节点注册顺序要固定

推荐约定：

```ts
remarkPlugin,
nodeSchema.ctx,
nodeSchema.node,
nodeView,
inputRules,
commands,
```

其中 `ctx` 永远在读取它的 `node`、`view`、`command` 之前。

### 3. 编辑器白屏优先查插件链

遇到 Milkdown/Crepe 白屏时，排查顺序：

1. 是否重复注册同名 node/mark
2. `$nodeSchema.ctx` 是否在 `$nodeSchema.node` 前
3. `view` 是否等待 schema ready 后才读取 node type
4. 是否存在多份 `@milkdown/core` 或 `@milkdown/ctx`
5. 是否在 editor created 前调用 `editorViewCtx`

### 4. 同名扩展要单独立项

当前自定义 `image-block` 与 Crepe 内置 `ImageBlock` 存在同名扩展关系。最小修复只处理初始化顺序；后续若继续治理，建议单独评估：

- 扩展内置 `imageBlockSchema`
- 或关闭 `CrepeFeature.ImageBlock` 后由自定义插件完整接管

这类变更会影响图片上传、caption、resize、素材库插图等体验，不应混入白屏热修。

## 一句话结论

Milkdown 自定义节点不是普通数组拼接，`ctx` 是 schema 初始化的地基；先注入上下文，再注册节点，最后挂 view。✅
