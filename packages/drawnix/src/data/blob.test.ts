import { describe, expect, it, vi } from 'vitest';
import {
  getSupportedVideoFileMimeType,
  isSupportedVideoFileType,
} from './blob';

vi.mock('../services/unified-cache-service', () => ({
  unifiedCacheService: {
    cacheMediaFromBlob: vi.fn(),
    getCachedBlob: vi.fn(),
    getCacheInfo: vi.fn(),
    isCached: vi.fn(),
  },
}));

describe('video file type helpers', () => {
  it('supports local mov files reported as QuickTime video', () => {
    expect(isSupportedVideoFileType('video/quicktime')).toBe(true);
  });

  it('falls back to the file extension when the browser omits MIME type', () => {
    const file = new File(['video'], 'clip.mov', { type: '' });

    expect(getSupportedVideoFileMimeType(file)).toBe('video/quicktime');
  });
});
