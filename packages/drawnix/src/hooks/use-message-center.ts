import { useEffect, useSyncExternalStore } from 'react';
import {
  fetchMessageCenterMessages,
  fetchMessageUnreadCount,
  hasXingtuBackendSession,
  markAllMessagesRead,
  markMessageRead,
  streamMessageCenterEvents,
  type MessageCenterItem,
} from '../services/message-center-service';

const PUBLIC_READ_STORAGE_KEY = 'aitu-message-center-public-read-ids';

export interface MessageCenterState {
  messages: MessageCenterItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  connected: boolean;
  authenticated: boolean;
}

const listeners = new Set<() => void>();
let state: MessageCenterState = {
  messages: [],
  unreadCount: 0,
  loading: false,
  error: null,
  connected: false,
  authenticated: false,
};
let started = false;
let refreshController: AbortController | null = null;
let streamController: AbortController | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function useMessageCenter(): MessageCenterState {
  useEffect(() => {
    startMessageCenter();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export async function refreshMessageCenter(): Promise<void> {
  refreshController?.abort();
  const controller = new AbortController();
  refreshController = controller;
  setState({ loading: true, error: null });

  try {
    const result = await fetchMessageCenterMessages(controller.signal);
    const messages = result.authenticated
      ? result.messages
      : applyPublicReadState(result.messages);
    const unreadCount = result.authenticated
      ? await fetchMessageUnreadCount(controller.signal)
      : getPublicUnreadCount(messages);
    setState({
      messages,
      unreadCount,
      authenticated: result.authenticated,
      loading: false,
      error: null,
    });
  } catch (error) {
    if (controller.signal.aborted) return;
    setState({ loading: false, error: getErrorMessage(error) });
  }
}

export async function markMessageCenterItemRead(messageId: string): Promise<void> {
  if (state.authenticated || hasXingtuBackendSession()) {
    const unreadCount = await markMessageRead(messageId);
    setState({ unreadCount });
    await refreshMessageCenter();
    return;
  }

  writePublicReadIds(new Set([...readPublicReadIds(), messageId]));
  const messages = applyPublicReadState(state.messages);
  setState({ messages, unreadCount: getPublicUnreadCount(messages) });
}

export async function markAllMessageCenterItemsRead(): Promise<void> {
  if (state.authenticated || hasXingtuBackendSession()) {
    const unreadCount = await markAllMessagesRead();
    setState({ unreadCount });
    await refreshMessageCenter();
    return;
  }

  writePublicReadIds(new Set(state.messages.map((message) => message.id)));
  setState({ messages: applyPublicReadState(state.messages), unreadCount: 0 });
}

function applyPublicReadState(messages: MessageCenterItem[]): MessageCenterItem[] {
  const readIds = readPublicReadIds();
  return messages.map((message) => readIds.has(message.id)
    ? { ...message, readAt: message.readAt || message.updatedAt }
    : message
  );
}

function startMessageCenter(): void {
  if (started) return;
  started = true;
  void refreshMessageCenter();
  connectStream();
}

function connectStream(): void {
  reconnectTimer && clearTimeout(reconnectTimer);
  streamController?.abort();
  const controller = new AbortController();
  streamController = controller;

  void streamMessageCenterEvents(controller.signal, () => {
    void refreshMessageCenter();
  })
    .then(() => {
      if (!controller.signal.aborted) {
        setState({ connected: false });
        scheduleReconnect();
      }
    })
    .catch((error) => {
      if (controller.signal.aborted) return;
      console.debug('[message-center] SSE connection failed:', error);
      setState({ connected: false });
      scheduleReconnect();
    });
  setState({ connected: true });
}

function scheduleReconnect(): void {
  reconnectTimer && clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connectStream, 5000);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): MessageCenterState {
  return state;
}

function setState(patch: Partial<MessageCenterState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function getPublicUnreadCount(messages: MessageCenterItem[]): number {
  const readIds = readPublicReadIds();
  return messages.filter((message) => !message.readAt && !readIds.has(message.id)).length;
}

function readPublicReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(PUBLIC_READ_STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) as unknown : [];
    return Array.isArray(ids)
      ? new Set(ids.filter((id): id is string => typeof id === 'string'))
      : new Set();
  } catch (error) {
    console.debug('[message-center] Failed to read public read ids:', error);
    return new Set();
  }
}

function writePublicReadIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PUBLIC_READ_STORAGE_KEY, JSON.stringify([...ids]));
  } catch (error) {
    console.debug('[message-center] Failed to write public read ids:', error);
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '消息加载失败';
}
