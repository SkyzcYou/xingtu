import { autoUpdateSafety } from './auto-update-safety';
/**
 * Chat Storage Service
 *
 * Handles persistence of chat sessions and messages using IndexedDB via localforage.
 */

import localforage from 'localforage';
import { generateUUID } from '../utils/runtime-helpers';
import { CHAT_STORAGE_KEYS, CHAT_CONSTANTS } from '../constants/CHAT_CONSTANTS';
import type {
  ChatSession,
  ChatMessage,
  DrawerState,
} from '../types/chat.types';

// Initialize localforage instances
const sessionsStore = localforage.createInstance({
  name: CHAT_STORAGE_KEYS.DATABASE_NAME,
  storeName: CHAT_STORAGE_KEYS.SESSIONS_STORE,
});

const messagesStore = localforage.createInstance({
  name: CHAT_STORAGE_KEYS.DATABASE_NAME,
  storeName: CHAT_STORAGE_KEYS.MESSAGES_STORE,
});

// Retain exact failed writes so an update can retry persistence without
// replaying a chat request or incrementing session counters a second time.
const pendingChatWrites = new Map<string, Promise<unknown>>();
const failedChatWrites = new Map<string, () => Promise<unknown>>();

async function persistChatWrite(
  key: string,
  write: () => Promise<unknown>
): Promise<void> {
  const previous = pendingChatWrites.get(key) || Promise.resolve();
  const pending = previous
    .catch(() => undefined)
    .then(write)
    .then(
      () => {
        failedChatWrites.delete(key);
      },
      (error) => {
        failedChatWrites.set(key, write);
        throw error;
      }
    );
  pendingChatWrites.set(key, pending);
  try {
    await pending;
  } finally {
    if (pendingChatWrites.get(key) === pending) pendingChatWrites.delete(key);
  }
}

autoUpdateSafety.registerParticipant('chat-storage', {
  getBlockReason: () =>
    pendingChatWrites.size > 0 ? '正在保存聊天记录' : null,
  flush: async () => {
    await Promise.all(pendingChatWrites.values());
    for (const [key, write] of [...failedChatWrites])
      await persistChatWrite(key, write);
  },
});

/** Generate UUID v4 */
function generateId(): string {
  return generateUUID();
}

/** Generate session title from first message */
function generateTitle(content: string): string {
  const cleaned = content.trim().replace(/\n/g, ' ');
  if (cleaned.length <= CHAT_CONSTANTS.MAX_TITLE_LENGTH) {
    return cleaned;
  }
  return cleaned.slice(0, CHAT_CONSTANTS.MAX_TITLE_LENGTH - 3) + '...';
}

// ============================================================================
// Session Operations
// ============================================================================

export async function createSession(): Promise<ChatSession> {
  const now = Date.now();
  const session: ChatSession = {
    id: generateId(),
    title: '新对话',
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };

  await persistChatWrite(`session:${session.id}`, () =>
    sessionsStore.setItem(session.id, session)
  );
  return session;
}

export async function getSession(id: string): Promise<ChatSession | null> {
  return sessionsStore.getItem<ChatSession>(id);
}

export async function getAllSessions(): Promise<ChatSession[]> {
  const sessions: ChatSession[] = [];
  await sessionsStore.iterate<ChatSession, void>((value) => {
    sessions.push(value);
  });
  // Wait for browser idle time before sorting to avoid blocking
  await new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as Window).requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });
  // Sort by updatedAt descending (newest first)
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateSession(
  id: string,
  updates: Partial<ChatSession>,
  options?: { preserveUpdatedAt?: boolean }
): Promise<void> {
  let snapshot: ChatSession | null = null;
  await persistChatWrite(`session:${id}`, async () => {
    if (!snapshot) {
      // Read and merge inside the same per-session queue. Concurrent draft and
      // workflow writes must not each replace a stale pre-queue snapshot.
      const session = await getSession(id);
      if (!session) return;
      snapshot = {
        ...session,
        ...updates,
        updatedAt: options?.preserveUpdatedAt
          ? session.updatedAt
          : updates.updatedAt || Date.now(),
      };
    }
    await sessionsStore.setItem(id, snapshot);
  });
}

export async function deleteSession(id: string): Promise<void> {
  // Delete all messages in the session first
  const messages = await getMessages(id);
  for (const message of messages) {
    await persistChatWrite(`message:${message.id}`, () =>
      messagesStore.removeItem(message.id)
    );
  }
  // Then delete the session
  await persistChatWrite(`session:${id}`, () => sessionsStore.removeItem(id));
}

// ============================================================================
// Message Operations
// ============================================================================

export async function addMessage(message: ChatMessage): Promise<void> {
  await persistChatWrite(`message:${message.id}`, () =>
    messagesStore.setItem(message.id, message)
  );

  // Update session message count and title if this is the first user message
  const session = await getSession(message.sessionId);
  if (session) {
    const updates: Partial<ChatSession> = {
      messageCount: session.messageCount + 1,
      updatedAt: Date.now(),
    };

    await updateSession(message.sessionId, updates);
  }
}

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const messages: ChatMessage[] = [];
  await messagesStore.iterate<ChatMessage, void>((value) => {
    if (value.sessionId === sessionId) {
      messages.push(value);
    }
  });
  // Sort by timestamp ascending (oldest first)
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}

export async function findWorkflowMessage(
  workflowId: string
): Promise<ChatMessage | null> {
  const matched = await messagesStore.iterate<ChatMessage, ChatMessage | void>(
    (value) => {
      if (value.workflow?.id === workflowId) {
        return value;
      }
      return undefined;
    }
  );
  return matched || null;
}

export async function findWorkflowMessageByTask(
  matcher: (workflow: NonNullable<ChatMessage['workflow']>) => boolean
): Promise<ChatMessage | null> {
  const matched = await messagesStore.iterate<ChatMessage, ChatMessage | void>(
    (value) => {
      if (value.workflow && matcher(value.workflow)) {
        return value;
      }
      return undefined;
    }
  );
  return matched || null;
}

export async function updateMessage(
  id: string,
  updates: Partial<ChatMessage>
): Promise<void> {
  let snapshot: ChatMessage | null = null;
  await persistChatWrite(`message:${id}`, async () => {
    if (!snapshot) {
      const message = await messagesStore.getItem<ChatMessage>(id);
      if (!message) return;
      snapshot = { ...message, ...updates };
    }
    await messagesStore.setItem(id, snapshot);
  });
}

export async function deleteMessage(id: string): Promise<void> {
  const message = await messagesStore.getItem<ChatMessage>(id);
  if (message) {
    await persistChatWrite(`message:${id}`, () => messagesStore.removeItem(id));
    // Update session message count
    const session = await getSession(message.sessionId);
    if (session) {
      await updateSession(message.sessionId, {
        messageCount: Math.max(0, session.messageCount - 1),
      });
    }
  }
}

// ============================================================================
// Drawer State Operations (localStorage for sync access)
// ============================================================================

const DEFAULT_DRAWER_STATE: DrawerState = {
  isOpen: false,
  width: Math.min(
    CHAT_CONSTANTS.DRAWER_MAX_WIDTH,
    Math.max(
      CHAT_CONSTANTS.DRAWER_MIN_WIDTH,
      window.innerWidth * CHAT_CONSTANTS.DRAWER_DEFAULT_WIDTH_RATIO
    )
  ),
  activeSessionId: null,
};

export function getDrawerState(): DrawerState {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEYS.DRAWER_STATE);
    if (stored) {
      return { ...DEFAULT_DRAWER_STATE, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('[ChatStorage] Failed to get drawer state:', error);
  }
  return DEFAULT_DRAWER_STATE;
}

export function setDrawerState(state: Partial<DrawerState>): void {
  try {
    const current = getDrawerState();
    const updated = { ...current, ...state };
    localStorage.setItem(
      CHAT_STORAGE_KEYS.DRAWER_STATE,
      JSON.stringify(updated)
    );
  } catch (error) {
    console.error('[ChatStorage] Failed to set drawer state:', error);
  }
}

// ============================================================================
// Cleanup Operations
// ============================================================================

export async function clearAllData(): Promise<void> {
  await Promise.allSettled(pendingChatWrites.values());
  await persistChatWrite('clear-sessions', () => sessionsStore.clear());
  await persistChatWrite('clear-messages', () => messagesStore.clear());
  failedChatWrites.clear();
  localStorage.removeItem(CHAT_STORAGE_KEYS.DRAWER_STATE);
}

export async function clearConversationHistory(): Promise<void> {
  await Promise.allSettled(pendingChatWrites.values());
  await persistChatWrite('clear-sessions', () => sessionsStore.clear());
  await persistChatWrite('clear-messages', () => messagesStore.clear());
  failedChatWrites.clear();
  setDrawerState({ activeSessionId: null });
}

// ============================================================================
// Utility Functions
// ============================================================================

export { generateId, generateTitle };

// Export as service object for easier mocking
export const chatStorageService = {
  createSession,
  getSession,
  getAllSessions,
  updateSession,
  deleteSession,
  addMessage,
  getMessages,
  findWorkflowMessage,
  findWorkflowMessageByTask,
  updateMessage,
  deleteMessage,
  getDrawerState,
  setDrawerState,
  clearAllData,
  clearConversationHistory,
  generateId,
  generateTitle,
};
