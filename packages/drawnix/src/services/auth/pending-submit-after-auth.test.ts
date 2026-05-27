import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearPendingSubmitAfterAuthDraft,
  consumePendingSubmitAfterAuthDraft,
  savePendingSubmitAfterAuthDraft,
} from './pending-submit-after-auth';

function createSessionStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

function createDraftInput() {
  return {
    prompt: '生成一张猫咪海报',
    generationType: 'image' as const,
    uploadedContent: [
      {
        type: 'image' as const,
        url: '/__aitu_cache__/cat.png',
        name: 'cat.png',
        width: 512,
        height: 512,
      },
    ],
    selectedContent: [],
    selectedModel: 'gpt-image-2',
    selectedModelRef: {
      profileId: 'legacy-default',
      modelId: 'gpt-image-2',
    },
    selectedParams: { size: '1024x1024' },
    selectedCount: 1,
    selectedSkillId: 'auto',
    knowledgeContextRefs: [
      {
        noteId: 'note-1',
        title: '角色设定',
      },
    ],
  };
}

describe('pending-submit-after-auth', () => {
  afterEach(() => {
    clearPendingSubmitAfterAuthDraft();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('saves, consumes, and clears a pending submit draft', () => {
    vi.stubGlobal('window', { sessionStorage: createSessionStorageMock() });

    expect(savePendingSubmitAfterAuthDraft(createDraftInput())).toBe(true);

    const draft = consumePendingSubmitAfterAuthDraft();
    expect(draft?.prompt).toBe('生成一张猫咪海报');
    expect(draft?.uploadedContent[0]?.url).toBe('/__aitu_cache__/cat.png');
    expect(draft?.selectedParams.size).toBe('1024x1024');
    expect(draft?.knowledgeContextRefs[0]?.noteId).toBe('note-1');
    expect(consumePendingSubmitAfterAuthDraft()).toBeNull();
  });

  it('drops expired drafts on consume', () => {
    vi.stubGlobal('window', { sessionStorage: createSessionStorageMock() });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-26T00:00:00Z'));
    expect(savePendingSubmitAfterAuthDraft(createDraftInput())).toBe(true);

    vi.setSystemTime(new Date('2026-05-26T02:00:00Z'));
    expect(consumePendingSubmitAfterAuthDraft()).toBeNull();
  });

  it('drops malformed drafts on consume', () => {
    vi.stubGlobal('window', { sessionStorage: createSessionStorageMock() });
    window.sessionStorage.setItem(
      'aitu:ai-input:pending-submit-after-auth:v1',
      '{not-json'
    );

    expect(consumePendingSubmitAfterAuthDraft()).toBeNull();
    expect(consumePendingSubmitAfterAuthDraft()).toBeNull();
  });
});
