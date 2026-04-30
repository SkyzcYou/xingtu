# Change: add built-in model recommendation scores and unify selector ordering

## Why
- 当前模型展示顺序主要依赖 `new`、版本号和少量启发式规则，无法体现基于实际 benchmark 结果整理出的内置模型优先级。
- 多个模型选择入口复用的排序链路并不完全一致，导致同一模型在不同选择器中的顺序可能不统一。

## What Changes
- 为内置模型配置增加可选的推荐分元数据，用于表达经过人工整理后的展示优先级。
- 将模型展示排序规则统一为：同模型名聚合后按新版本优先、再按推荐分倒序；其余规则仅作兜底。
- 让运行时可选模型链路也复用同一排序规则，确保聊天模型选择器、通用模型下拉、设置页模型列表保持一致。

## Impact
- Affected specs:
  - `runtime-model-discovery`
- Affected code:
  - `packages/drawnix/src/constants/model-config.ts`
  - `packages/drawnix/src/utils/model-sort.ts`
  - `packages/drawnix/src/utils/runtime-model-discovery.ts`
  - `packages/drawnix/src/components/ai-input-bar/ModelDropdown.tsx`
  - `packages/drawnix/src/components/chat-drawer/ModelSelector.tsx`
