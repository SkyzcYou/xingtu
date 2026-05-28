export type MessageKind = 'update' | 'notice' | 'activity' | 'maintenance';
export type MessageAudience = 'public' | 'authenticated' | 'accounts';
export type MessageStatus = 'draft' | 'published' | 'archived';

export interface AdminMessage {
  id: string;
  title: string;
  content: string;
  kind: MessageKind;
  priority: number;
  audience: MessageAudience;
  status: MessageStatus;
  linkUrl: string | null;
  linkLabel: string | null;
  publishAt: string | null;
  expireAt: string | null;
  version: number;
  createdBySubject: string;
  targetPrincipalIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminMessagesResponse {
  messages: AdminMessage[];
}

export interface UpsertMessageInput {
  title: string;
  content: string;
  kind: MessageKind;
  priority: number;
  audience: MessageAudience;
  linkUrl?: string;
  linkLabel?: string;
  publishAt?: string | null;
  expireAt?: string | null;
  targetPrincipalIds?: string[];
}

export const messageKinds: MessageKind[] = ['update', 'notice', 'activity', 'maintenance'];
export const messageAudiences: MessageAudience[] = ['public', 'authenticated', 'accounts'];
export const messageStatuses: MessageStatus[] = ['draft', 'published', 'archived'];

export function isAdminMessagesResponse(value: unknown): value is AdminMessagesResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AdminMessagesResponse>;
  return Array.isArray(data.messages) && data.messages.every(isAdminMessage);
}

export function isAdminMessage(value: unknown): value is AdminMessage {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AdminMessage>;
  return typeof data.id === 'string'
    && typeof data.title === 'string'
    && typeof data.content === 'string'
    && isMessageKind(data.kind)
    && typeof data.priority === 'number'
    && isMessageAudience(data.audience)
    && isMessageStatus(data.status)
    && (typeof data.linkUrl === 'string' || data.linkUrl === null)
    && (typeof data.linkLabel === 'string' || data.linkLabel === null)
    && (typeof data.publishAt === 'string' || data.publishAt === null)
    && (typeof data.expireAt === 'string' || data.expireAt === null)
    && typeof data.version === 'number'
    && typeof data.createdBySubject === 'string'
    && Array.isArray(data.targetPrincipalIds)
    && data.targetPrincipalIds.every((id) => typeof id === 'string')
    && typeof data.createdAt === 'string'
    && typeof data.updatedAt === 'string';
}

function isMessageKind(value: unknown): value is MessageKind {
  return typeof value === 'string' && messageKinds.includes(value as MessageKind);
}

function isMessageAudience(value: unknown): value is MessageAudience {
  return typeof value === 'string' && messageAudiences.includes(value as MessageAudience);
}

function isMessageStatus(value: unknown): value is MessageStatus {
  return typeof value === 'string' && messageStatuses.includes(value as MessageStatus);
}
