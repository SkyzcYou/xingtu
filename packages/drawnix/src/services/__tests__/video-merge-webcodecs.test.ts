import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('video-merge-webcodecs', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('VideoDecoder', undefined);
    vi.stubGlobal('VideoEncoder', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not throw when imported without WebCodecs support', async () => {
    await expect(import('../video-merge-webcodecs')).resolves.toBeTruthy();
  });

  it('checks WebCodecs support only when merging multiple videos', async () => {
    const { isWebCodecsSupported, mergeVideos } = await import(
      '../video-merge-webcodecs'
    );

    expect(isWebCodecsSupported()).toBe(false);
    await expect(mergeVideos(['a.mp4', 'b.mp4'])).rejects.toThrow(
      '当前浏览器不支持 WebCodecs API'
    );
  });
});
