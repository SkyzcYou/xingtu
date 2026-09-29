import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { autoUpdateSafety } from '../auto-update-safety';
import { addMessage, updateSession } from '../chat-storage-service';
import { MessageRole, MessageStatus } from '../../types/chat.types';

const mocks = vi.hoisted(() => ({
  setItem: vi.fn(),
  getItem: vi.fn(async () => null),
}));
vi.mock('localforage', () => ({
  default: {
    createInstance: () => ({ setItem: mocks.setItem, getItem: mocks.getItem }),
  },
}));
vi.mock('../../utils/runtime-helpers', () => ({
  generateUUID: () => 'test-id',
}));

beforeEach(() => {
  autoUpdateSafety.setAppReady(true);
  autoUpdateSafety.setDraining(false);
  vi.clearAllMocks();
});
afterEach(() => {
  autoUpdateSafety.release('chat-update');
});

const message = {
  id: 'message-1',
  sessionId: 'session-1',
  role: MessageRole.ASSISTANT,
  content: 'A response',
  status: MessageStatus.SUCCESS,
  timestamp: 1,
};

describe('chat write update safety', () => {
  it('holds pending response writes and retries only the stored response after failures', async () => {
    let rejectWrite!: (error: Error) => void;
    mocks.setItem.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectWrite = reject;
        })
    );
    const writing = addMessage(message);
    await Promise.resolve();
    await Promise.resolve();
    expect(await autoUpdateSafety.getBlockReason()).toBe('正在保存聊天记录');
    rejectWrite(new Error('磁盘已满'));
    await expect(writing).rejects.toThrow('磁盘已满');
    mocks.setItem.mockRejectedValueOnce(new Error('磁盘已满'));
    expect(await autoUpdateSafety.prepare('chat-update')).toEqual({
      ready: false,
      reason: '磁盘已满',
    });
    mocks.setItem.mockResolvedValueOnce(message);
    expect(await autoUpdateSafety.prepare('chat-update')).toEqual({
      ready: true,
    });
    expect(mocks.setItem).toHaveBeenCalledTimes(3);
    expect(mocks.setItem).toHaveBeenLastCalledWith('message-1', message);
  });
  it('merges concurrent session changes against the latest committed draft', async () => {
    let persisted: any = {
      id: 'session-1',
      title: 'New conversation',
      createdAt: 1,
      updatedAt: 1,
      messageCount: 0,
    };
    mocks.getItem.mockImplementation(async () => ({ ...persisted }));
    mocks.setItem.mockImplementation(async (_id, value) => {
      persisted = { ...value };
      return value;
    });
    await Promise.all([
      updateSession('session-1', { title: 'Generated title' }),
      updateSession('session-1', { messageCount: 3 }),
    ]);
    expect(persisted).toMatchObject({
      title: 'Generated title',
      messageCount: 3,
    });
  });
});
