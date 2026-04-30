# Change: add audio playlists and favorites

## Why
- 当前音乐播放器只能基于临时音频队列播放，缺少“收藏”和“播放列表”这层持久化管理能力。
- 用户需要在音频素材卡片上快速收藏，并通过右键将音频加入指定播放列表，同时不破坏现有画布音频播放逻辑。

## What Changes
- 新增持久化音频播放列表能力，默认创建系统播放列表“收藏”
- 支持创建、重命名、删除普通播放列表
- 支持为播放列表添加/移除音频，支持收藏/取消收藏
- 在音频素材卡片增加收藏心心与右键菜单
- 将音乐播放器扩展为支持 `canvas` / `playlist` 双轨播放队列

## Impact
- Affected specs: `canvas-audio-playback`
- Affected code:
  - `packages/drawnix/src/services/canvas-audio-playback-service.ts`
  - `packages/drawnix/src/components/media-library/*`
  - `packages/drawnix/src/tools/tools/music-player/*`
  - `packages/drawnix/src/contexts/*`
