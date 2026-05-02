# Change: 增加爆款音乐歌曲定位控制

## Why

爆款音乐工具的从零创作和歌词改写当前主要依赖自由文本，用户需要在自然语言里同时表达用途、曲风、人声、情绪和歌词目标。缺少轻量结构化创作定位会让歌词和 Suno 风格标签不稳定，后续音乐生成也更容易偏离预期。

## What Changes

- 在现有音乐分析记录上增加可选 `musicBrief`，不新增独立实体或新模态
- 为从零创作和歌词改写增加轻量歌曲定位输入
- 歌曲定位包含用途、核心曲风、人声/唱法、情绪能量、歌词目标
- 将歌曲定位注入歌词生成/改写提示词，用于约束 `title / styleTags / lyricsDraft`
- 参考音频模式允许歌曲定位补充音频分析结果，不覆盖用户手动编辑的标题、标签和歌词

## Impact

- Affected specs:
  - `audio-generation`
- Affected code:
  - `packages/drawnix/src/components/music-analyzer/*`
