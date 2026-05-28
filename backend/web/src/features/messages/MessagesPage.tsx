import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Tag } from 'tdesign-react';
import { EmptyState } from '../../components/EmptyState';
import { PageError } from '../../components/PageError';
import { PageLoading } from '../../components/PageLoading';
import { SectionCard } from '../../components/SectionCard';
import { getCreditAccounts } from '../credits/credits.api';
import {
  archiveAdminMessage,
  createAdminMessage,
  getAdminMessages,
  publishAdminMessage,
  updateAdminMessage,
} from './messages.api';
import {
  messageAudiences,
  messageKinds,
  messageStatuses,
  type AdminMessage,
  type MessageAudience,
  type MessageKind,
  type MessageStatus,
  type UpsertMessageInput,
} from './messages.types';
import './MessagesPage.scss';

const kindLabels: Record<MessageKind, string> = {
  update: '产品更新',
  notice: '通知',
  activity: '活动',
  maintenance: '维护',
};

const audienceLabels: Record<MessageAudience, string> = {
  public: '公开',
  authenticated: '登录用户',
  accounts: '指定账号',
};

const statusLabels: Record<MessageStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};

const emptyDraft: UpsertMessageInput = {
  title: '',
  content: '',
  kind: 'notice',
  priority: 0,
  audience: 'public',
  publishAt: null,
  expireAt: null,
  targetPrincipalIds: [],
};

export function MessagesPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<MessageStatus | ''>('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<UpsertMessageInput>(emptyDraft);
  const [formError, setFormError] = useState('');
  const [accountQuery, setAccountQuery] = useState('');

  const messagesQuery = useQuery({
    queryKey: ['admin-messages', status, query],
    queryFn: () => getAdminMessages({ status, query }),
  });
  const accountsQuery = useQuery({
    queryKey: ['credit-accounts', accountQuery],
    queryFn: () => getCreditAccounts(accountQuery),
    enabled: draft.audience === 'accounts',
  });

  const selectedMessage = useMemo(
    () => messagesQuery.data?.messages.find((message) => message.id === selectedId) || null,
    [messagesQuery.data, selectedId]
  );

  useEffect(() => {
    if (!selectedMessage) return;
    setDraft(messageToDraft(selectedMessage));
    setFormError('');
  }, [selectedMessage]);

  const createMutation = useMutation({
    mutationFn: createAdminMessage,
    onSuccess: (message) => {
      setSelectedId(message.id);
      setFormError('');
      void queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
    },
    onError: (error) => setFormError(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpsertMessageInput }) => updateAdminMessage(id, input),
    onSuccess: () => {
      setFormError('');
      void queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
    },
    onError: (error) => setFormError(error.message),
  });

  const publishMutation = useMutation({
    mutationFn: publishAdminMessage,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-messages'] }),
    onError: (error) => setFormError(error.message),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveAdminMessage,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-messages'] }),
    onError: (error) => setFormError(error.message),
  });

  const messages = messagesQuery.data?.messages ?? [];
  const selectedTargetIds = new Set(draft.targetPrincipalIds || []);

  function handleNewMessage() {
    setSelectedId('');
    setDraft(emptyDraft);
    setFormError('');
  }

  function updateDraft(patch: Partial<UpsertMessageInput>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = normalizeDraft(draft);
    const error = validateDraft(input);
    if (error) {
      setFormError(error);
      return;
    }
    if (selectedId) {
      updateMutation.mutate({ id: selectedId, input });
    } else {
      createMutation.mutate(input);
    }
  }

  function toggleTarget(principalId: string) {
    setDraft((current) => {
      const ids = new Set(current.targetPrincipalIds || []);
      if (ids.has(principalId)) {
        ids.delete(principalId);
      } else {
        ids.add(principalId);
      }
      return { ...current, targetPrincipalIds: [...ids] };
    });
  }

  if (messagesQuery.isLoading) {
    return <PageLoading text="正在加载消息" />;
  }

  if (messagesQuery.error) {
    return <PageError message={messagesQuery.error.message} onRetry={() => messagesQuery.refetch()} />;
  }

  return (
    <div className="page-stack messages-page">
      <SectionCard
        title="消息管理"
        description="创建产品更新、活动通知和维护提醒，发布后会实时推送到星图消息中心。"
        action={<Button theme="primary" onClick={handleNewMessage}>新建消息</Button>}
      >
        <div className="messages-toolbar">
          <select value={status} onChange={(event) => setStatus(event.target.value as MessageStatus | '')}>
            <option value="">全部状态</option>
            {messageStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
          </select>
          <input placeholder="搜索标题或内容" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Button onClick={() => messagesQuery.refetch()}>刷新</Button>
        </div>
      </SectionCard>

      <div className="messages-grid">
        <SectionCard title="消息列表" description="归档消息不会再出现在用户消息中心。">
          {messages.length === 0 ? (
            <EmptyState title="暂无消息" description="点击新建消息开始配置。" />
          ) : (
            <div className="messages-list">
              {messages.map((message) => (
                <button
                  key={message.id}
                  className="messages-list-item"
                  data-active={message.id === selectedId}
                  onClick={() => setSelectedId(message.id)}
                >
                  <strong>{message.title}</strong>
                  <span>{kindLabels[message.kind]} · {audienceLabels[message.audience]}</span>
                  <span>{formatDateTime(message.updatedAt)}</span>
                  <Tag>{statusLabels[message.status]}</Tag>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={selectedId ? '编辑消息' : '新建消息'}
          description="消息内容按纯文本展示；链接仅支持 http/https 或站内路径。"
          action={selectedMessage && (
            <div className="messages-actions">
              {selectedMessage.status !== 'archived' && (
                <Button variant="outline" onClick={() => publishMutation.mutate(selectedMessage.id)} loading={publishMutation.isPending}>发布</Button>
              )}
              {selectedMessage.status !== 'archived' && (
                <Button variant="outline" onClick={() => archiveMutation.mutate(selectedMessage.id)} loading={archiveMutation.isPending}>归档</Button>
              )}
            </div>
          )}
        >
          <form className="messages-form" onSubmit={handleSubmit}>
            <label>
              <span>标题</span>
              <input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} />
            </label>
            <label>
              <span>内容</span>
              <textarea rows={8} value={draft.content} onChange={(event) => updateDraft({ content: event.target.value })} />
            </label>
            <div className="messages-form-row">
              <label>
                <span>类型</span>
                <select value={draft.kind} onChange={(event) => updateDraft({ kind: event.target.value as MessageKind })}>
                  {messageKinds.map((item) => <option key={item} value={item}>{kindLabels[item]}</option>)}
                </select>
              </label>
              <label>
                <span>优先级</span>
                <input type="number" value={draft.priority} onChange={(event) => updateDraft({ priority: Number(event.target.value) })} />
              </label>
            </div>
            <label>
              <span>受众</span>
              <select value={draft.audience} onChange={(event) => updateDraft({ audience: event.target.value as MessageAudience })}>
                {messageAudiences.map((item) => <option key={item} value={item}>{audienceLabels[item]}</option>)}
              </select>
            </label>
            {draft.audience === 'accounts' && (
              <div className="messages-targets">
                <div className="messages-toolbar">
                  <input placeholder="搜索用户 subject、昵称或邮箱" value={accountQuery} onChange={(event) => setAccountQuery(event.target.value)} />
                  <Button onClick={() => accountsQuery.refetch()}>搜索账号</Button>
                </div>
                <div className="messages-target-list">
                  {(accountsQuery.data?.accounts ?? []).map((account) => (
                    <button key={account.principalId} type="button" data-active={selectedTargetIds.has(account.principalId)} onClick={() => toggleTarget(account.principalId)}>
                      <strong>{account.displayName || account.email || account.trustSubject}</strong>
                      <span>{account.email || account.trustSubject}</span>
                    </button>
                  ))}
                </div>
                <p className="muted-text">已选择 {selectedTargetIds.size} 个账号</p>
              </div>
            )}
            <div className="messages-form-row">
              <label>
                <span>链接地址</span>
                <input value={draft.linkUrl || ''} onChange={(event) => updateDraft({ linkUrl: event.target.value })} />
              </label>
              <label>
                <span>链接文案</span>
                <input value={draft.linkLabel || ''} onChange={(event) => updateDraft({ linkLabel: event.target.value })} />
              </label>
            </div>
            <div className="messages-form-row">
              <label>
                <span>发布时间</span>
                <input type="datetime-local" value={toDateTimeLocal(draft.publishAt)} onChange={(event) => updateDraft({ publishAt: fromDateTimeLocal(event.target.value) })} />
              </label>
              <label>
                <span>过期时间</span>
                <input type="datetime-local" value={toDateTimeLocal(draft.expireAt)} onChange={(event) => updateDraft({ expireAt: fromDateTimeLocal(event.target.value) })} />
              </label>
            </div>
            {formError && <p className="form-error">{formError}</p>}
            <Button theme="primary" type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {selectedId ? '保存消息' : '创建草稿'}
            </Button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}

function messageToDraft(message: AdminMessage): UpsertMessageInput {
  return {
    title: message.title,
    content: message.content,
    kind: message.kind,
    priority: message.priority,
    audience: message.audience,
    linkUrl: message.linkUrl || '',
    linkLabel: message.linkLabel || '',
    publishAt: message.publishAt,
    expireAt: message.expireAt,
    targetPrincipalIds: message.targetPrincipalIds,
  };
}

function normalizeDraft(input: UpsertMessageInput): UpsertMessageInput {
  return {
    ...input,
    title: input.title.trim(),
    content: input.content.trim(),
    linkUrl: input.linkUrl?.trim() || undefined,
    linkLabel: input.linkLabel?.trim() || undefined,
    targetPrincipalIds: input.audience === 'accounts' ? input.targetPrincipalIds || [] : [],
  };
}

function validateDraft(input: UpsertMessageInput): string {
  if (!input.title) return '标题不能为空';
  if (!input.content) return '内容不能为空';
  if (!Number.isInteger(input.priority)) return '优先级必须是整数';
  if (input.audience === 'accounts' && !input.targetPrincipalIds?.length) return '指定账号消息至少选择一个账号';
  if (input.publishAt && input.expireAt && new Date(input.expireAt) <= new Date(input.publishAt)) return '过期时间必须晚于发布时间';
  return '';
}

function toDateTimeLocal(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
