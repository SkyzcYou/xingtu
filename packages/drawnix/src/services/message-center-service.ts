import {
  getXingtuBackendAccessToken,
  getXingtuBackendApiBaseUrl,
  hasXingtuBackendSession as hasBackendSession,
  xingtuBackendRequest,
} from './xingtu-backend-request';

export type MessageKind = 'update' | 'notice' | 'activity' | 'maintenance';
export type MessageAudience = 'public' | 'authenticated' | 'accounts';

export interface MessageCenterItem {
  id: string;
  title: string;
  content: string;
  kind: MessageKind;
  priority: number;
  audience: MessageAudience;
  linkUrl: string | null;
  linkLabel: string | null;
  publishAt: string | null;
  expireAt: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageCenterEvent {
  eventType: string;
  messageId: string;
  version: number;
  audience: MessageAudience;
}

interface MessagesResponse {
  messages: MessageCenterItem[];
}

interface UnreadCountResponse {
  unreadCount: number;
}

export interface MessageListResult {
  messages: MessageCenterItem[];
  authenticated: boolean;
}

export function hasXingtuBackendSession(): boolean {
  return hasBackendSession();
}

export async function fetchMessageCenterMessages(signal?: AbortSignal): Promise<MessageListResult> {
  if (hasXingtuBackendSession()) {
    const response = await xingtuBackendRequest<unknown>('/api/messages', {
      auth: 'required',
      signal,
    });
    if (!isMessagesResponse(response)) {
      throw new Error('消息列表响应格式无效');
    }
    return { messages: response.messages, authenticated: true };
  }

  const response = await xingtuBackendRequest<unknown>('/api/public/messages', {
    auth: 'none',
    signal,
  });
  if (!isMessagesResponse(response)) {
    throw new Error('公开消息列表响应格式无效');
  }
  return { messages: response.messages, authenticated: false };
}

export async function fetchMessageUnreadCount(signal?: AbortSignal): Promise<number> {
  if (!hasXingtuBackendSession()) {
    return 0;
  }
  const response = await xingtuBackendRequest<unknown>('/api/messages/unread-count', {
    auth: 'required',
    signal,
  });
  if (!isUnreadCountResponse(response)) {
    throw new Error('未读数响应格式无效');
  }
  return response.unreadCount;
}

export async function markMessageRead(messageId: string): Promise<number> {
  const response = await xingtuBackendRequest<unknown>(`/api/messages/${messageId}/read`, {
    auth: 'required',
    method: 'POST',
  });
  if (!isUnreadCountResponse(response)) {
    throw new Error('已读响应格式无效');
  }
  return response.unreadCount;
}

export async function markAllMessagesRead(): Promise<number> {
  const response = await xingtuBackendRequest<unknown>('/api/messages/read-all', {
    auth: 'required',
    method: 'POST',
  });
  if (!isUnreadCountResponse(response)) {
    throw new Error('全部已读响应格式无效');
  }
  return response.unreadCount;
}

export async function streamMessageCenterEvents(
  signal: AbortSignal,
  onEvent: (event: MessageCenterEvent) => void
): Promise<void> {
  const authenticated = hasXingtuBackendSession();
  const token = authenticated ? await getXingtuBackendAccessToken('required') : null;
  const response = await fetch(
    `${getXingtuBackendApiBaseUrl()}${authenticated ? '/api/messages/events' : '/api/public/messages/events'}`,
    {
      signal,
      headers: {
        accept: 'text/event-stream',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`消息推送连接失败：${response.status}`);
  }
  if (!response.body) {
    throw new Error('浏览器不支持消息推送流');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.replace(/\r\n/g, '\n').split('\n\n');
    buffer = parts.pop() || '';
    for (const frame of parts) {
      parseEventFrame(frame, onEvent);
    }
  }
}

function parseEventFrame(frame: string, onEvent: (event: MessageCenterEvent) => void): void {
  const data = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n');
  if (!data) return;
  try {
    const event = JSON.parse(data) as unknown;
    if (isMessageCenterEvent(event)) {
      onEvent(event);
    }
  } catch (error) {
    console.debug('[message-center] Failed to parse SSE event:', error);
  }
}

function isMessagesResponse(value: unknown): value is MessagesResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<MessagesResponse>;
  return Array.isArray(data.messages) && data.messages.every(isMessageCenterItem);
}

function isMessageCenterItem(value: unknown): value is MessageCenterItem {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<MessageCenterItem>;
  return typeof data.id === 'string'
    && typeof data.title === 'string'
    && typeof data.content === 'string'
    && isMessageKind(data.kind)
    && typeof data.priority === 'number'
    && isMessageAudience(data.audience)
    && (typeof data.linkUrl === 'string' || data.linkUrl === null)
    && (typeof data.linkLabel === 'string' || data.linkLabel === null)
    && (typeof data.publishAt === 'string' || data.publishAt === null)
    && (typeof data.expireAt === 'string' || data.expireAt === null)
    && (typeof data.readAt === 'string' || data.readAt === null)
    && typeof data.createdAt === 'string'
    && typeof data.updatedAt === 'string';
}

function isMessageCenterEvent(value: unknown): value is MessageCenterEvent {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<MessageCenterEvent>;
  return typeof data.eventType === 'string'
    && typeof data.messageId === 'string'
    && typeof data.version === 'number'
    && isMessageAudience(data.audience);
}

function isUnreadCountResponse(value: unknown): value is UnreadCountResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<UnreadCountResponse>;
  return typeof data.unreadCount === 'number';
}

function isMessageKind(value: unknown): value is MessageKind {
  return typeof value === 'string' && ['update', 'notice', 'activity', 'maintenance'].includes(value);
}

function isMessageAudience(value: unknown): value is MessageAudience {
  return typeof value === 'string' && ['public', 'authenticated', 'accounts'].includes(value);
}
