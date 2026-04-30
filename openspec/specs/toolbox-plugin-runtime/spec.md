# toolbox-plugin-runtime Specification

## Purpose
Define the shared runtime contract for toolbox iframe tools and internal React tools.

## Requirements
### Requirement: iframe 与内部工具必须共享统一运行时协议
系统 SHALL 允许 `iframe` 工具和内部 React 工具通过同一工具定义模型被打开、最小化和嵌入画布，并允许支持多实例的工具打开多个独立窗口实例，以及通过工具定义声明默认窗口行为。

#### Scenario: 打开内部工具
- **WHEN** 用户从工具箱打开内部工具
- **THEN** 系统根据注册中心解析对应内部组件

#### Scenario: 打开 iframe 工具
- **WHEN** 用户从工具箱打开 URL 工具
- **THEN** 系统根据工具定义渲染 iframe

#### Scenario: 多实例工具新开窗口
- **GIVEN** 某工具被标记为支持多实例
- **WHEN** 用户从工具栏图标右键选择“新窗口打开”
- **THEN** 系统为该工具创建新的窗口实例
- **AND** 新旧实例各自维护独立的位置、尺寸和最小化状态
- **AND** 工具栏分别显示对应实例图标

#### Scenario: 单实例工具保持兼容
- **GIVEN** 某工具尚未标记为支持多实例
- **WHEN** 用户通过已有入口再次打开该工具
- **THEN** 系统继续复用或聚焦现有窗口行为
- **AND** 不暴露可点击的“新窗口打开”入口

#### Scenario: 工具定义声明默认自动常驻
- **GIVEN** 某工具定义声明 `defaultWindowBehavior.autoPinOnOpen = true`
- **AND** 用户尚未手动取消该工具的常驻状态
- **WHEN** 系统通过常规入口首次打开该工具
- **THEN** 工具窗口服务 SHALL 将该工具加入常驻工具栏

#### Scenario: 调用方显式覆盖默认窗口行为
- **GIVEN** 某工具定义声明 `defaultWindowBehavior.autoPinOnOpen = true`
- **WHEN** 调用方以显式 `autoPin: false` 打开该工具
- **THEN** 系统 SHALL 以调用方显式选项为准
- **AND** 不因为工具默认行为再次自动常驻
