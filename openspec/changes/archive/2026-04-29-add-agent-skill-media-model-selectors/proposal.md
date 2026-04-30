# Change: add agent skill media model selectors

## Why
Agent 模式选择图片、视频、音频或 PPT 类 Skill 时，当前输入栏只暴露文本模型选择，用户无法明确控制后续媒体生成工具实际使用的模型。

## What Changes
- Agent 模式保留文本模型选择器，用于 `ai_analyze`
- 当用户明确选择媒体类 Skill 时，在输入栏追加对应媒体模型选择器
- PPT 类 Skill 复用图片模型选择器
- 将所选媒体模型和 `modelRef` 透传到 Agent 动态工具调用和 Skill 解析出的媒体步骤

## Impact
- Affected specs: ai-input-generation
- Affected code: `AIInputBar`、`SkillDropdown`、`workflow-converter`、`ai-analyze`、`AgentExecutionContext`
