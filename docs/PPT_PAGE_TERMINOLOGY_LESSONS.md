# PPT 页面术语改造经验

## 背景

PPT 编辑场景中，底层实现沿用了 `Frame` 容器模型，但客户看到 `Frame` 会产生理解成本。面向客户的界面应统一使用「PPT 页面」或「PPT」概念，代码层模型仍保留 `Frame`，避免扩大改造范围。

## 经验原则

1. 客户术语和技术模型分层。
   - UI、tooltip、空状态、确认弹窗、命令面板、图层类型、导出错误等客户可见内容使用「PPT 页面」。
   - 类型名、文件名、函数名、`frameId`、插件内部注释和日志可以继续保留 `Frame`。

2. 不做全局替换。
   - 仓库里还有视频首帧/尾帧、`requestAnimationFrame`、内部 Frame 绑定关系等语义。
   - 只改白板容器/PPT 编辑路径，避免误伤视频和浏览器动画逻辑。

3. 默认名要兼容旧数据。
   - 旧画布可能已经保存了 `Frame 1` / `Slide 1`。
   - 展示层应把默认名映射为 `PPT 页面 1`，同时保留用户自定义名称。

4. 新建默认值应使用新术语。
   - 新建页面默认命名为 `PPT 页面 N`。
   - 重新编号、插入前后页也应继续使用「PPT 页面」命名。

5. 空状态图标要匹配业务隐喻。
   - 列表类 icon 容易让用户误解为普通列表。
   - PPT 编辑空状态更适合使用演示/页面图标，并将文案拆成主状态和创建建议两行。

## 检查清单

- 抽屉页签：显示「PPT 编辑」并使用演示类图标。
- 搜索框：`搜索 PPT 页面...`。
- 操作按钮：添加、播放、导出、排列都使用 PPT 页面语义。
- 空状态：说明当前没有 PPT 页面，并引导用「生成完整PPT」Skill 创建。
- 右键菜单和确认弹窗：删除、插入、复制等提示使用「PPT 页面」。
- 图层面板：Frame 类型标签显示为「PPT 页面」。
- 命令面板：`PPT 页面`、`自适应 PPT 页面`。
- 工具栏 i18n：`PPT 页面 — F`、`自适应 PPT 页面`。
- PPT 导出错误：没有可导出内容时提示「PPT 页面」。
- 画布标题：默认 Frame 标题展示为 `PPT 页面 N`。

## 验证建议

1. 搜索客户可见旧文案：

```bash
rg -n 'Frame 容器|添加 Frame|搜索 Frame|没有 Frame|匹配的 Frame|可导出的 Frame|自适应 Frame|Fit Frame|Frame Container|当前画布没有 Frame' packages/drawnix/src --glob '!generated/**'
```

2. 保留内部技术语义：

```bash
rg -n 'requestAnimationFrame|targetFrameId|frameId|isFrameElement' packages/drawnix/src
```

3. 做轻量校验：

```bash
git diff --check
```

## 提交备注模板

```text
问题描述:
- PPT 编辑界面暴露 Frame 技术概念，客户理解成本高。

修复思路:
- 保留底层 Frame 数据模型，仅将客户可见文案、展示名和入口改为 PPT 页面概念。
- 增加默认名展示映射，兼容旧的 Frame/Slide 默认标题。

更新代码架构:
- 新增统一显示名入口，避免散落硬编码。
- PPT 编辑面板、命令面板、图层面板和导出提示共享「PPT 页面」用户语言。
```
