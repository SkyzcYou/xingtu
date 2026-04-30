# toolbox Specification

## Purpose
TBD - created by archiving change add-prompt-history-tool. Update Purpose after archive.
## Requirements
### Requirement: Prompt History Toolbox Tool
The system SHALL provide a built-in toolbox tool named "提示词历史" that opens as an internal React tool.

#### Scenario: User opens prompt history from toolbox
- **WHEN** the user opens the toolbox
- **THEN** the "提示词历史" tool is available as a content tool
- **AND** opening it shows local prompt history records derived from generation tasks

### Requirement: Prompt History Tool Uses Lightweight Records
The prompt history tool SHALL read only lightweight task summaries for list rendering and result previews.

#### Scenario: Large media tasks exist
- **WHEN** prompt history records are loaded
- **THEN** the list data excludes large uploaded media, analysis payloads, tool call arrays, and full generated media blobs
- **AND** media previews reference existing URLs or thumbnails

### Requirement: 工具栏必须展示同工具的多个窗口实例
系统 SHALL 在左侧工具栏中将同一工具的多个已打开或最小化实例显示为多个独立图标，并在图标上提供实例序号标识。

#### Scenario: 多个实例并列显示
- **GIVEN** 用户已为同一个工具打开两个窗口实例
- **WHEN** 左侧工具栏渲染工具实例
- **THEN** 工具栏显示两个独立图标
- **AND** 两个图标使用相同工具图标并带有不同的实例序号角标

#### Scenario: 常驻工具无实例时回退为启动图标
- **GIVEN** 某工具被常驻到工具栏且当前没有打开实例
- **WHEN** 左侧工具栏渲染该工具
- **THEN** 工具栏仅显示一个关闭态启动图标
- **AND** 用户点击该图标时系统新建一个窗口实例

### Requirement: 工具栏右键菜单必须支持新窗口打开
系统 SHALL 在支持多实例的工具图标右键菜单中提供“新窗口打开”操作，用于从当前工具直接新建窗口实例。

#### Scenario: 从工具图标右键新开实例
- **GIVEN** 某工具支持多实例并已在工具栏显示
- **WHEN** 用户右键该工具图标并选择“新窗口打开”
- **THEN** 系统新建一个该工具的窗口实例
- **AND** 新实例默认以级联偏移方式打开，避免与已有实例完全重叠

### Requirement: 特定工具可声明默认常驻工具栏
系统 SHALL 允许工具通过定义元数据声明“打开后默认常驻工具栏”行为，并在所有常规打开入口中保持一致。

#### Scenario: 爆款工具打开后自动常驻
- **GIVEN** 用户打开“爆款视频生成”或“爆款音乐生成”
- **WHEN** 工具窗口成功创建
- **THEN** 左侧最小化工具栏 SHALL 显示该工具的常驻图标
- **AND** 用户关闭窗口后仍可通过 launcher 图标再次打开

#### Scenario: 用户手动取消常驻后保持用户选择
- **GIVEN** 某工具具备默认自动常驻规则
- **AND** 用户已在工具栏中手动取消该工具常驻
- **WHEN** 用户后续再次打开该工具
- **THEN** 系统 SHALL 优先保留用户当前常驻选择

