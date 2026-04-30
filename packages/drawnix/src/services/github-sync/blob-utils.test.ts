/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { base64ToBlob, formatSize } from './blob-utils';

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

describe('github-sync blob-utils', () => {
  it('converts base64 to typed blob', async () => {
    const blob = base64ToBlob('SGVsbG8=', 'text/plain');

    expect(blob.type).toBe('text/plain');
    expect(blob.size).toBe(5);
    expect(await readBlobAsText(blob)).toBe('Hello');
  });

  it('formats byte sizes with legacy units', () => {
    expect(formatSize(42)).toBe('42 B');
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatSize(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});
