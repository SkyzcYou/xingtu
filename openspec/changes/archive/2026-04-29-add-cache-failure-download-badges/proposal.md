# Change: 为缓存失败素材增加尽快下载提示角标

## Why
部分远程图片/视频素材可以直接预览，但浏览器未必能稳定写入本地缓存；如果原始链接带签名有效期，用户之后可能无法再次访问。当前用户在素材库或任务队列中看到资源可预览时，容易误以为已离线保存，等链接过期后才发现素材不可恢复。

## What Changes
- 为媒体缓存失败或不可缓存的任务结果与素材增加轻量警告状态
- 在素材库卡片和任务队列卡片显示“需下载/缓存失败”角标
- hover 角标时说明原因，并提示用户尽快下载保存
- 提示逻辑只依据缓存结果与缓存状态，不依据模型名或供应商名判断
- 不对列表资源做额外跨域探测，避免增加渲染成本和网络压力

## Impact
- Affected specs: `media-cache-warnings`
- Affected code:
  - `packages/drawnix/src/types/asset.types.ts`
  - `packages/drawnix/src/types/shared/core.types.ts`
  - `packages/drawnix/src/services/unified-cache-service.ts`
  - `packages/drawnix/src/services/task-queue-service.ts`
  - `packages/drawnix/src/components/media-library/*`
  - `packages/drawnix/src/components/task-queue/*`
