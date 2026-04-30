# Change: add audio playback modes

## Why
- 当前播放器只有基础上一首/下一首能力，缺少顺序播放、循环播放和随机播放等常见模式。
- 悬浮播放器与音乐播放器工具页共用同一播放状态，如果播放模式只做在某一个入口，会造成体验割裂。

## What Changes
- 为统一音频播放 service 增加 `顺序播放`、`列表循环`、`单曲循环`、`随机播放` 4 种模式
- 在悬浮播放器和音乐播放器工具页都提供播放模式下拉切换
- 播放模式持久化到本地存储，刷新后恢复
- 曲目结束和朗读结束时按当前模式自动续播

## Impact
- Affected specs: `canvas-audio-playback`
- Affected code:
  - `packages/drawnix/src/services/canvas-audio-playback-service.ts`
  - `packages/drawnix/src/components/audio-node-element/CanvasAudioPlayer.tsx`
  - `packages/drawnix/src/tools/tools/music-player/MusicPlayerTool.tsx`
