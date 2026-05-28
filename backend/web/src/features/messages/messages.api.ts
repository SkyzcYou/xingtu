import { request } from '../../lib/api/request';
import {
  isAdminMessage,
  isAdminMessagesResponse,
  type AdminMessage,
  type AdminMessagesResponse,
  type MessageStatus,
  type UpsertMessageInput,
} from './messages.types';

export async function getAdminMessages(input: { status?: MessageStatus | ''; query?: string }): Promise<AdminMessagesResponse> {
  const params = new URLSearchParams();
  if (input.status) params.set('status', input.status);
  if (input.query?.trim()) params.set('query', input.query.trim());
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await request<unknown>(`/api/admin/messages${suffix}`);
  if (!isAdminMessagesResponse(response)) {
    throw new Error('消息列表响应格式无效');
  }
  return response;
}

export async function createAdminMessage(input: UpsertMessageInput): Promise<AdminMessage> {
  const response = await request<unknown>('/api/admin/messages', {
    method: 'POST',
    body: JSON.stringify(toRequestBody(input)),
  });
  if (!isAdminMessage(response)) {
    throw new Error('消息创建响应格式无效');
  }
  return response;
}

export async function updateAdminMessage(id: string, input: UpsertMessageInput): Promise<AdminMessage> {
  const response = await request<unknown>(`/api/admin/messages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toRequestBody(input)),
  });
  if (!isAdminMessage(response)) {
    throw new Error('消息保存响应格式无效');
  }
  return response;
}

export async function publishAdminMessage(id: string): Promise<AdminMessage> {
  const response = await request<unknown>(`/api/admin/messages/${id}/publish`, {
    method: 'POST',
  });
  if (!isAdminMessage(response)) {
    throw new Error('消息发布响应格式无效');
  }
  return response;
}

export async function archiveAdminMessage(id: string): Promise<AdminMessage> {
  const response = await request<unknown>(`/api/admin/messages/${id}/archive`, {
    method: 'POST',
  });
  if (!isAdminMessage(response)) {
    throw new Error('消息归档响应格式无效');
  }
  return response;
}

function toRequestBody(input: UpsertMessageInput) {
  return {
    title: input.title,
    content: input.content,
    kind: input.kind,
    priority: input.priority,
    audience: input.audience,
    linkUrl: input.linkUrl || null,
    linkLabel: input.linkLabel || null,
    publishAt: input.publishAt || null,
    expireAt: input.expireAt || null,
    targetPrincipalIds: input.audience === 'accounts' ? input.targetPrincipalIds || [] : [],
  };
}
