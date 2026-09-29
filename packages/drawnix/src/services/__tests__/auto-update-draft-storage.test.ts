import { describe, expect, it } from 'vitest';
import {
  clearAutoUpdateDraft,
  getNonDurableDraftReason,
  readAutoUpdateDraft,
  saveAutoUpdateDraft,
} from '../auto-update-draft-storage';

function createStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
}
const isDraft = (
  value: unknown
): value is { prompt: string; uploads: unknown[] } =>
  Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as any).prompt === 'string' &&
      Array.isArray((value as any).uploads)
  );

describe('automatic update draft storage', () => {
  it('keeps separate board and tab drafts and restores exact attachments without submitting', () => {
    const tabOne = createStorage();
    const tabTwo = createStorage();
    const draft = {
      prompt: '尚未发送的提示词',
      uploads: [
        {
          url: '/asset-library/durable-image',
          maskImage: 'data:image/png;base64,abc',
        },
      ],
      boundDrafts: [['element', { prompt: '目标草稿' }]],
      associations: [{ boardId: 'a', elementId: 'node' }],
    };
    saveAutoUpdateDraft('taskbar:a', draft, tabOne, 100);
    expect(readAutoUpdateDraft('taskbar:a', isDraft, tabOne, 110)).toEqual(
      draft
    );
    expect(readAutoUpdateDraft('taskbar:b', isDraft, tabOne, 110)).toBeNull();
    expect(readAutoUpdateDraft('taskbar:a', isDraft, tabTwo, 110)).toBeNull();
    clearAutoUpdateDraft('taskbar:a', tabOne);
    expect(readAutoUpdateDraft('taskbar:a', isDraft, tabOne, 110)).toBeNull();
  });

  it('refuses ephemeral or unserializable attachments rather than silently dropping them', () => {
    const storage = createStorage();
    expect(() =>
      saveAutoUpdateDraft(
        'a',
        { uploads: [{ url: 'blob:https://app/image' }] },
        storage
      )
    ).toThrow('尚未持久化');
    expect(
      getNonDurableDraftReason({ uploads: [new Blob(['image'])] })
    ).toBeTruthy();
    const cyclic: any = {};
    cyclic.self = cyclic;
    expect(getNonDurableDraftReason(cyclic)).toBeTruthy();
    expect(
      getNonDurableDraftReason({ first: { a: 1 }, optional: undefined })
    ).toBeNull();
  });

  it('fails closed on storage errors, silent truncation and oversized drafts', () => {
    expect(() =>
      saveAutoUpdateDraft(
        'a',
        {},
        {
          ...createStorage(),
          setItem: () => {
            throw new Error('quota');
          },
        }
      )
    ).toThrow('quota');
    expect(() =>
      saveAutoUpdateDraft(
        'a',
        {},
        { ...createStorage(), getItem: () => 'truncated' }
      )
    ).toThrow('完整保存');
    expect(() =>
      saveAutoUpdateDraft(
        'a',
        { text: 'x'.repeat(4 * 1024 * 1024) },
        createStorage()
      )
    ).toThrow('草稿较大');
  });

  it('ignores stale snapshots and wrong schemas', () => {
    const storage = createStorage();
    saveAutoUpdateDraft('a', { prompt: 'draft', uploads: [] }, storage, 100);
    expect(readAutoUpdateDraft('a', isDraft, storage, 86_400_101)).toBeNull();
    saveAutoUpdateDraft('a', { prompt: 1 }, storage, 100);
    expect(readAutoUpdateDraft('a', isDraft, storage, 110)).toBeNull();
  });
});
