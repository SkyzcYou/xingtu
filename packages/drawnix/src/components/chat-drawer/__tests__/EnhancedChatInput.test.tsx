// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { EnhancedChatInput } from '../EnhancedChatInput';
import { autoUpdateSafety } from '../../../services/auto-update-safety';
import {
  readAutoUpdateDraft,
  saveAutoUpdateDraft,
} from '../../../services/auto-update-draft-storage';

const chatDrawerControlMock = vi.hoisted(() => ({
  submitGenerationFromDrawer: vi.fn(async () => true),
  getActiveSessionId: vi.fn(() => 'session-1'),
}));

const generationControlsMock = vi.hoisted(() => ({
  controls: {
    generationType: 'agent',
    setGenerationType: vi.fn(),
    selectedModel: 'gpt-5.4',
    selectedModelRef: null,
    selectedSelectionKey: 'gpt-5.4',
    selectedParams: {},
    compatibleParams: [],
    selectedCount: 1,
    setSelectedCount: vi.fn(),
    currentModels: [],
    handleModelSelect: vi.fn(),
    handleModelConfigSelect: vi.fn(),
    handleParamSelect: vi.fn(),
  },
}));
const submitGenerationFromDrawerMock =
  chatDrawerControlMock.submitGenerationFromDrawer;

vi.mock('../../../contexts/ChatDrawerContext', () => ({
  useChatDrawerControl: () => chatDrawerControlMock,
}));

vi.mock('../../../hooks/usePromptHistory', () => ({
  usePromptHistory: () => ({
    addHistory: () => undefined,
  }),
}));

vi.mock('../../../i18n', () => ({
  useI18n: () => ({
    language: 'zh',
  }),
}));

vi.mock('../../../contexts/AssetContext', () => ({
  useAssets: () => ({
    addAsset: async () => undefined,
  }),
}));

vi.mock('../useChatDrawerGenerationControls', () => ({
  useChatDrawerGenerationControls: () => generationControlsMock.controls,
}));

vi.mock('../../shared/SelectedContentPreview', () => ({
  SelectedContentPreview: () => (
    <div data-testid="selected-content-preview">selected</div>
  ),
}));

vi.mock('../../ai-input-bar/GenerationTypeDropdown', () => ({
  GenerationTypeDropdown: () => <button type="button">类型</button>,
}));

vi.mock('../../ai-input-bar/ModelDropdown', () => ({
  ModelDropdown: () => <button type="button">模型</button>,
}));

vi.mock('../../ai-input-bar/ParametersDropdown', () => ({
  ParametersDropdown: () => <button type="button">参数</button>,
}));

vi.mock('../../ai-input-bar/CountDropdown', () => ({
  CountDropdown: () => <button type="button">数量</button>,
}));

vi.mock('../../media-library/MediaLibraryModal', () => ({
  MediaLibraryModal: () => <div data-testid="media-library-modal" />,
}));

vi.mock('../../icons', () => ({
  ImageUploadIcon: () => <span aria-hidden="true">upload</span>,
  MediaLibraryIcon: () => <span aria-hidden="true">library</span>,
}));

beforeEach(() => {
  autoUpdateSafety.release('chat-draft-test');
  autoUpdateSafety.setDraining(false);
  autoUpdateSafety.setAppReady(true);
  sessionStorage.clear();
  generationControlsMock.controls.generationType = 'agent';
  submitGenerationFromDrawerMock.mockClear();
});

afterEach(() => {
  autoUpdateSafety.release('chat-draft-test');
  autoUpdateSafety.setAppReady(false);
  chatDrawerControlMock.submitGenerationFromDrawer.mockClear();
  chatDrawerControlMock.getActiveSessionId.mockClear();
  generationControlsMock.controls.generationType = 'agent';
  cleanup();
});

describe('EnhancedChatInput placeholder', () => {
  it('renders through the shared drawer composer shell', () => {
    render(
      <EnhancedChatInput
        selectedContent={[]}
        onSend={() => undefined}
        placeholder="继续描述要修改的内容..."
      />
    );

    expect(screen.getByTestId('ai-input-composer-shell-drawer')).toBeTruthy();
    expect(screen.getByTestId('drawer-ai-send-btn')).toBeTruthy();
    expect(screen.getByText('类型')).toBeTruthy();
    expect(screen.getByText('模型')).toBeTruthy();
  });

  it('uses continuation copy when there is no attached content', () => {
    render(
      <EnhancedChatInput
        selectedContent={[]}
        onSend={() => undefined}
        placeholder="继续描述要修改的内容..."
      />
    );

    expect(screen.getByPlaceholderText('继续描述要修改的内容...')).toBeTruthy();
  });

  it('keeps effect-description copy when content is attached', () => {
    render(
      <EnhancedChatInput
        selectedContent={[
          {
            type: 'image',
            name: '参考图',
            url: 'data:image/png;base64,abc',
          },
        ]}
        onSend={() => undefined}
        placeholder="继续描述要修改的内容..."
      />
    );

    expect(screen.getByPlaceholderText('描述你想要的效果...')).toBeTruthy();
  });

  it('passes the active session id when submitting a drawer generation task', async () => {
    generationControlsMock.controls.generationType = 'image';

    render(
      <EnhancedChatInput
        selectedContent={[]}
        onSend={() => undefined}
        placeholder="继续描述要修改的内容..."
      />
    );

    fireEvent.change(screen.getByPlaceholderText('继续描述要修改的内容...'), {
      target: { value: '继续生成一张图' },
    });
    fireEvent.click(screen.getByTestId('drawer-ai-send-btn'));

    await waitFor(() => {
      expect(
        chatDrawerControlMock.submitGenerationFromDrawer
      ).toHaveBeenCalled();
    });
    expect(
      chatDrawerControlMock.submitGenerationFromDrawer
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '继续生成一张图',
        targetSessionId: 'session-1',
      })
    );
  });

  it('lets the drawer queue a generation without submitting it twice', async () => {
    generationControlsMock.controls.generationType = 'image';
    const onGenerationSubmit = vi.fn(async () => true);

    render(
      <EnhancedChatInput
        selectedContent={[]}
        onSend={() => undefined}
        onGenerationSubmit={onGenerationSubmit}
      />
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '生成一张海报' },
    });
    fireEvent.click(screen.getByTestId('drawer-ai-send-btn'));

    await waitFor(() => {
      expect(onGenerationSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onGenerationSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '生成一张海报',
        generationType: 'image',
        selectedModel: 'gpt-5.4',
        targetSessionId: 'session-1',
      })
    );
    expect(submitGenerationFromDrawerMock).not.toHaveBeenCalled();
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
  });
});

describe('EnhancedChatInput implicit workflow references', () => {
  const implicitReferenceContent = [
    {
      type: 'image' as const,
      name: '上一次生成结果',
      url: '/previous-result.png',
    },
  ];

  it('uses implicit references for image edits that mention prior results', async () => {
    generationControlsMock.controls.generationType = 'image';

    render(
      <EnhancedChatInput
        selectedContent={[]}
        implicitReferenceContent={implicitReferenceContent}
        onSend={() => undefined}
      />
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '把上面的人改成小李子' },
    });
    fireEvent.click(screen.getByTestId('drawer-ai-send-btn'));

    expect(submitGenerationFromDrawerMock).toHaveBeenCalledTimes(1);
    expect(submitGenerationFromDrawerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '把上面的人改成小李子',
        selectedContent: implicitReferenceContent,
        generationType: 'image',
      })
    );
  });

  it('does not use implicit references for unrelated image prompts', async () => {
    generationControlsMock.controls.generationType = 'image';

    render(
      <EnhancedChatInput
        selectedContent={[]}
        implicitReferenceContent={implicitReferenceContent}
        onSend={() => undefined}
      />
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '生成一只猫' },
    });
    fireEvent.click(screen.getByTestId('drawer-ai-send-btn'));

    expect(submitGenerationFromDrawerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedContent: [],
      })
    );
  });

  it('uses pinned reply references and consumes them after submit', async () => {
    generationControlsMock.controls.generationType = 'image';
    const onImplicitReferenceConsumed = vi.fn();

    render(
      <EnhancedChatInput
        selectedContent={[]}
        implicitReferenceContent={implicitReferenceContent}
        implicitReferenceLabel="回复：图片生成"
        implicitReferencePinned
        onImplicitReferenceConsumed={onImplicitReferenceConsumed}
        onSend={() => undefined}
      />
    );

    expect(screen.getByText('回复：图片生成')).toBeTruthy();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '换成小李子' },
    });
    fireEvent.click(screen.getByTestId('drawer-ai-send-btn'));

    expect(submitGenerationFromDrawerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedContent: implicitReferenceContent,
      })
    );
    await waitFor(() => {
      expect(onImplicitReferenceConsumed).toHaveBeenCalledTimes(1);
    });
  });
});

describe('EnhancedChatInput automatic update persistence', () => {
  it('restores this tab’s complete draft instead of another tab’s shared session value', async () => {
    const draft = {
      draftInput: '本标签页尚未发送的内容',
      draftUploadedContent: [
        { type: 'image', name: '图', url: '/asset-library/image' },
      ],
    };
    saveAutoUpdateDraft('chat:session-1', draft);
    render(
      <EnhancedChatInput
        activeSessionId="session-1"
        selectedContent={[]}
        draftInput="另一标签页的草稿"
        onDraftChange={async () => undefined}
        onSend={() => undefined}
      />
    );
    await waitFor(() =>
      expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
        draft.draftInput
      )
    );
    expect(
      readAutoUpdateDraft('chat:session-1', (value): value is typeof draft =>
        Boolean(value)
      )
    ).toBeNull();
  });

  it('flushes the latest input before the debounce and waits for full attachment persistence', async () => {
    let finishWrite!: () => void;
    const persisted = new Promise<void>((resolve) => {
      finishWrite = resolve;
    });
    const attachment = {
      type: 'image' as const,
      name: '参考图',
      url: `data:image/png;base64,${'a'.repeat(4096)}`,
      maskImage: '/asset-library/mask',
    };
    const onDraftChange = vi.fn((_session, _draft, options) =>
      options?.flush ? persisted : Promise.resolve()
    );
    const { rerender } = render(
      <EnhancedChatInput
        activeSessionId="session-1"
        selectedContent={[]}
        draftInput="原始草稿"
        draftUploadedContent={[attachment]}
        onDraftChange={onDraftChange}
        onSend={() => undefined}
      />
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '最后输入，尚未触发 debounce' },
    });
    let result: unknown;
    const preparing = autoUpdateSafety
      .prepare('chat-draft-test')
      .then((value) => {
        result = value;
      });
    await waitFor(() =>
      expect(onDraftChange).toHaveBeenCalledWith(
        'session-1',
        {
          draftInput: '最后输入，尚未触发 debounce',
          draftUploadedContent: [attachment],
        },
        { flush: true }
      )
    );
    expect(result).toBeUndefined();
    await act(async () => {
      finishWrite();
      await preparing;
    });
    expect(result).toEqual({ ready: true });
    expect(
      readAutoUpdateDraft('chat:session-1', (value): value is object =>
        Boolean(value)
      )
    ).toBeTruthy();
    autoUpdateSafety.release('chat-draft-test');
    expect(
      readAutoUpdateDraft('chat:session-1', (value): value is object =>
        Boolean(value)
      )
    ).toBeNull();
    rerender(
      <EnhancedChatInput
        activeSessionId="session-1"
        selectedContent={[]}
        draftInput="较旧的持久化值"
        draftUploadedContent={[]}
        onDraftChange={onDraftChange}
        onSend={() => undefined}
      />
    );
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
      '最后输入，尚未触发 debounce'
    );
  });

  it('defers refresh when the draft save fails', async () => {
    const onDraftChange = vi.fn(async () => {
      throw new Error('storage full');
    });
    render(
      <EnhancedChatInput
        activeSessionId="session-1"
        selectedContent={[]}
        draftInput="不能丢失"
        onDraftChange={onDraftChange}
        onSend={() => undefined}
      />
    );
    const result = await autoUpdateSafety.prepare('chat-draft-test');
    expect(result).toEqual({ ready: false, reason: 'storage full' });
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
      '不能丢失'
    );
  });

  it('vetoes dead blob attachments and unsaved new-session drafts', async () => {
    const onDraftChange = vi.fn(async () => undefined);
    const { unmount } = render(
      <EnhancedChatInput
        activeSessionId="session-1"
        selectedContent={[]}
        draftUploadedContent={[
          {
            type: 'image',
            name: '待保存附件',
            url: 'blob:https://example.test/photo',
          },
        ]}
        onDraftChange={onDraftChange}
        onSend={() => undefined}
      />
    );
    expect((await autoUpdateSafety.prepare('chat-draft-test')).ready).toBe(
      false
    );
    expect(onDraftChange).not.toHaveBeenCalled();
    unmount();
    render(
      <EnhancedChatInput
        selectedContent={[]}
        draftInput="未关联会话"
        onSend={() => undefined}
      />
    );
    expect((await autoUpdateSafety.prepare('chat-draft-test')).ready).toBe(
      false
    );
  });
});
