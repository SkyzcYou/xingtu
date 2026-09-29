import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatHandler } from '../useChatHandler';
import { autoUpdateSafety } from '../../services/auto-update-safety';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  save: vi.fn(async () => undefined),
  error: vi.fn(),
}));
vi.mock('tdesign-react', () => ({ MessagePlugin: { error: mocks.error } }));
vi.mock('../../services/chat-service', () => ({
  chatService: { sendChatMessage: mocks.send, stopGeneration: vi.fn() },
}));
vi.mock('../../services/chat-storage-service', () => ({
  chatStorageService: {
    getMessages: vi.fn(async () => []),
    addMessage: mocks.save,
    getSession: vi.fn(async () => ({ messageCount: 0 })),
    updateSession: vi.fn(async () => undefined),
    generateId: () => 'assistant-1',
  },
}));
vi.mock('../../services/agent', () => ({ generateSystemPrompt: () => '' }));
vi.mock('../../services/agent/tool-parser', () => ({
  parseToolCalls: () => [],
  extractTextContent: (text: string) => text,
}));
vi.mock('../../mcp', () => ({
  initializeMCP() {},
  mcpRegistry: { executeTool: vi.fn() },
}));
vi.mock('../chat-utils', () => ({
  WORKFLOW_MESSAGE_PREFIX: 'workflow:',
  injectModelForGenerationTool: (value: unknown) => value,
  toChatUIMessage: (value: unknown) => value,
  fromChatUIMessage: (value: any, sessionId: string) => ({
    ...value,
    sessionId,
  }),
  toApiMessage: (value: unknown) => value,
  extractMessageText: () => 'hello',
}));

beforeEach(() => {
  vi.clearAllMocks();
  autoUpdateSafety.setAppReady(true);
  autoUpdateSafety.setDraining(false);
});
afterEach(() => {
  cleanup();
  autoUpdateSafety.setDraining(false);
  autoUpdateSafety.release('stream-update');
});
const message = {
  id: 'user-1',
  role: 'user' as const,
  parts: [{ type: 'text' as const, text: 'hello' }],
};

describe('standalone chat stream update safety', () => {
  it('vetoes updates through the stream and releases after completion', async () => {
    let finish!: () => void;
    mocks.send.mockImplementation(
      (_history, _text, _attachments, onEvent) =>
        new Promise<void>((resolve) => {
          finish = () => {
            onEvent({ type: 'done' });
            resolve();
          };
        })
    );
    const { result } = renderHook(() =>
      useChatHandler({ sessionId: 'session-1' })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let sending!: Promise<void>;
    act(() => {
      sending = result.current.sendMessage(message);
    });
    await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(1));
    expect(await autoUpdateSafety.prepare('stream-update')).toEqual({
      ready: false,
      reason: '正在接收聊天回复',
    });
    await act(async () => {
      finish();
      await sending;
    });
    expect(await autoUpdateSafety.getBlockReason()).toBeNull();
    expect(mocks.save).toHaveBeenCalledTimes(2);
  });

  it('rejects admission before storing or sending and reports the error', async () => {
    const { result } = renderHook(() =>
      useChatHandler({ sessionId: 'session-1' })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    autoUpdateSafety.setDraining(true);
    await act(async () => {
      await expect(result.current.sendMessage(message)).rejects.toThrow(
        '自动更新'
      );
    });
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledTimes(1);
    expect(await autoUpdateSafety.getBlockReason()).toBeNull();
  });

  it('releases the busy operation when persistence fails before sending', async () => {
    mocks.save.mockRejectedValueOnce(new Error('存储已满'));
    const { result } = renderHook(() =>
      useChatHandler({ sessionId: 'session-1' })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await expect(result.current.sendMessage(message)).rejects.toThrow(
        '存储已满'
      );
    });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(await autoUpdateSafety.getBlockReason()).toBeNull();
  });
});
