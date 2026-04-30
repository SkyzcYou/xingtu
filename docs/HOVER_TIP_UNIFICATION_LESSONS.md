# Hover 提示统一经验

更新日期：2026-04-30

## 背景

项目已经提取了共享 hover 提示组件，但应用 UI 中仍散落着原生 `title`、`data-tooltip`、局部 CSS tooltip 和直接使用 TDesign `Tooltip` 的写法。

这类分散实现会导致样式、延迟、层级、可访问性和测试行为不一致，也容易在新功能里继续扩散。

## 需求边界

本次统一的是“应用 UI 的视觉 hover 提示”，不是机械删除所有 `title`。

需要统一：

- 按钮、图标、菜单、工具栏、状态徽章、素材库、AI 输入栏、属性面板等应用 UI hover 文案。
- 原生 DOM `title`、`data-tooltip`、局部 CSS tips。
- 组件层直接引入 `tdesign-react` 的 `Tooltip`。
- `ToolButton title` 的新增使用。

暂不统一：

- Markdown/用户内容渲染出来的链接、图片语义 `title`。
- TDesign 表单 `tips`，它是静态说明文案，不是 hover 提示。

## 组件规则

- 简短纯文本提示使用 `HoverTip`。
- 富内容、需要鼠标停留或可交互内容的 hover 浮层使用 `HoverCard`。
- `ToolButton title` 只作为兼容入口保留，新代码使用 `tooltip`。
- 共享封装内部可以使用 TDesign `Tooltip`，业务组件不要直接引入。
- 测试容易 mock `../shared` 聚合导出时，优先从 `../shared/hover` 引入 `HoverTip`，减少 mock 破坏面。

## 迁移模式

### DOM title

```tsx
<HoverTip content="上传图片" showArrow={false}>
  <button onClick={handleUpload}>
    <ImageUploadIcon />
  </button>
</HoverTip>
```

### ToolButton

```tsx
<ToolButton
  type="icon"
  icon={<DownloadIcon />}
  aria-label="下载"
  tooltip="下载"
/>
```

### 条件提示

```tsx
<HoverTip content={model.id} disabled={!showIdTooltip} showArrow={false}>
  <div role="option">{model.label}</div>
</HoverTip>
```

## 守卫脚本经验

不要只靠简单正则扫描 JSX。

`onClick={() => ...}` 这类属性里包含 `>`，如果用 `<button[^>]*title=` 会在箭头函数处提前截断，漏掉后面的 `title`。

更稳的做法：

- 扫描 JSX opening tag 时记录 `{}` 深度。
- 同时处理字符串引号和模板字符串。
- 找到真正的 tag 结束 `>` 后再判断属性。
- 用脚本所在 package 根目录作为路径基准，避免从仓库根和 package 目录执行时例外路径不一致。

检查脚本应覆盖：

- `src/components`
- `src/tools`
- `*.ts`
- `*.tsx`
- `*.scss`
- `*.css`

明确允许共享封装和 Markdown 用户内容例外，其他例外必须写进脚本，不要靠口头约定。

## 性能注意

高频网格路径要特别小心，例如素材库图片卡片、缩略图列表、颜色块列表。

规则：

- 不要在一个高密度列表项里叠多层 hover 浮层。
- 非关键提示优先用可见短文案或静态省略展示。
- hover 样式不要触发布局变化。
- 避免在列表 hover 上使用大阴影、`backdrop-filter` 或频繁 portal 定位。

如果产品必须在高频网格上保留提示，优先只给关键操作加 `HoverTip`，不要给每个子元素都加。

## Lint 接入经验

`drawnix` lint 原先直接 `eslint .`，会扫进 `node_modules` 里的第三方 `.eslintrc`，导致无关失败。

更合理的命令：

- ESLint 只扫项目源码目录。
- hover 守卫脚本独立执行。
- 即使 ESLint 被既有基线挡住，也要继续执行 hover 守卫脚本，避免新规则失效。

同时，由于项目把 `tdesign-react` 映射到本地样式聚合入口，需要在 Nx module boundary 规则中允许 `tdesign-react` 虚拟入口，否则 ESLint 可能尝试把它当内部路径重写并崩溃。

## 验证清单

- `openspec validate refactor-hover-tip-unification --strict`
- `pnpm --dir packages/drawnix exec node scripts/check-hover-usage.mjs`
- `pnpm --dir packages/drawnix exec vitest run src/components/shared/hover/hover-utils.test.tsx`
- `pnpm nx typecheck drawnix`
- `pnpm nx lint drawnix`

如果 `pnpm nx lint drawnix` 被既有 ESLint 基线阻塞，需要在结果里明确区分：

- hover 守卫是否通过
- typecheck 是否通过
- lint 失败是否来自本次改动

## 修复检查清单

- 应用 UI 不再直接使用原生 hover `title`。
- 应用 UI 不再使用 `data-tooltip` 或局部 CSS tooltip。
- 业务组件不直接从 `tdesign-react` 引入 `Tooltip`。
- `ToolButton` 新用法使用 `tooltip`，不是 `title`。
- Markdown/用户内容 `title` 例外写进守卫脚本。
- TDesign 表单 `tips` 不按 hover 处理。
- 守卫脚本从仓库根和 `packages/drawnix` 目录执行都能得到一致结果。
