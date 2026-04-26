# PostHog PPT 与提示词能力报表

本文档记录 PPT、提示词库、提示词优化与提示词工具的 PostHog 埋点口径和看板。事件通过 `analytics.track()` 异步脱敏上报，不上传原始 prompt、PPT 文本、图片 URL 或文件名。

当前看板：

- 名称：`PPT 与提示词能力分析`
- 地址：`https://us.posthog.com/project/263621/dashboard/1511704`
- 创建日期：2026-04-26
- 图表数量：13

## 事件口径

### `ppt_action`

用于分析 PPT 大纲、页面编辑、批量生图、素材替换、导出播放等动作。

核心字段：

- `action`: `generate_outline`、`mindmap_to_ppt`、`generate_outline_slides`、`export_all`、`open_slideshow`
- `source`: `mcp_generate_ppt`、`project_drawer_outline`、`popup_toolbar`
- `status`: `start` / `success` / `failed` / `cancelled`
- `pageCount`、`frameCount`、`selectedCount`、`successCount`、`failedCount`
- `durationMs`、`serialMode`、`model`
- `prompt_length_bucket`、`prompt_line_count`、`has_prompt`

### `prompt_action`

用于分析提示词历史、预设、优化、工具打开、搜索筛选、选择回用等动作。

核心字段：

- `action`: `open_tool`、`open_panel`、`select`、`select_record`、`unselect_record`、`pin`、`delete`、`preview_example`、`optimize`、`apply`、`search`、`filter_category`、`filter_skill`、`refresh`、`load_more`
- `surface`: `ai_input_bar`、`inspiration_board`、`ai_input_prompt_popover`、`prompt_history_tool`、`prompt_list`、`prompt_optimize_dialog`、`ppt_common_prompt`
- `promptType`: `image`、`video`、`audio`、`text`、`agent`、`ppt-common`、`ppt-slide`
- `mode`: `polish` / `structured`
- `status`、`model`、`durationMs`、`itemCount`
- `prompt_length_bucket`、`requirements_length_bucket`

## 看板图表

当前 PostHog 看板包含 13 张图表：

- PPT 功能动作总览（14d）
- PPT 日趋势按动作（14d）
- PPT 大纲到导出转化节点（14d）
- PPT 生图成功率与失败页数（14d）
- PPT 提示词编辑与优化采用（14d）
- 提示词功能动作总览（14d）
- 提示词日趋势按动作（14d）
- 提示词优化转化与失败（14d）
- 提示词长度与补充要求分布（14d）
- 提示词工具入口与采用路径（14d）
- 提示词历史工具搜索筛选（14d）
- 提示词历史选择与回用信号（14d）
- 提示词工具来源与类型分布（14d）

## 优化判断

- `open_tool` 少：提示词工具入口弱，优先优化 AI 输入栏与灵感区入口可见性。
- `open_panel` 高但 `select` 低：提示词列表可读性、分类或预览吸引力不足。
- `search` / `filter_*` 高：用户有明确查找意图，可补更强的标签、排序和收藏能力。
- `select_record` 高但后续生成低：历史提示词被翻找但未形成回用，优先优化回填/复用动作。
- `optimize.success` 高但 `apply` 低：优化结果质量或回填路径需要继续打磨。
- `requirements_length_bucket = 0` 高：补充要求入口可能未被理解，可优化占位文案。

## 版本观察建议

上线后先观察 24 小时：

1. 看 `ppt_action` 与 `prompt_action` 是否都有真实流量，确认埋点链路通。
2. 看 `generate_outline_slides` 的 `failedCount / selectedCount`，定位 PPT 生图失败压力。
3. 看 `prompt_action.apply / prompt_action.optimize.success`，衡量提示词优化是否真正被采用。
4. 看 `select / open_panel` 与 `select_record / open_tool`，判断提示词工具是否带来真实回用。
