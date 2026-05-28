import { getFreshOidcAccessToken } from './auth/oidc-session';
import { XINGTU_BACKEND_DEFAULT_BASE_URL } from '../utils/settings-manager';

export interface AccountCreditLedgerEntry {
  id: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  modelId: string | null;
  requestType: string | null;
  requestId: string | null;
  createdAt: string;
}

export interface AccountCreditUsage {
  principalId: string;
  balance: number;
  ledger: AccountCreditLedgerEntry[];
}

export async function getAccountCreditUsage(signal?: AbortSignal): Promise<AccountCreditUsage> {
  const token = await getFreshOidcAccessToken();
  if (!token) {
    throw new Error('登录状态已失效，请重新登录');
  }

  let response = await fetchAccountCreditUsage(token, signal);
  if (response.status === 401) {
    const refreshedToken = await getFreshOidcAccessToken({ forceRefresh: true });
    if (refreshedToken) {
      response = await fetchAccountCreditUsage(refreshedToken, signal);
    }
  }
  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `积分信息加载失败：${response.status}`));
  }
  if (!isAccountCreditUsage(payload)) {
    throw new Error('积分信息响应格式无效');
  }
  return payload;
}

function fetchAccountCreditUsage(
  token: string,
  signal?: AbortSignal
): Promise<Response> {
  return fetch(`${getAccountApiBaseUrl()}/api/credit-usage`, {
    signal,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
    },
  });
}

function getAccountApiBaseUrl(): string {
  const envBaseUrl = import.meta.env.VITE_XINGTU_BACKEND_BASE_URL;
  const baseUrl = typeof envBaseUrl === 'string' && envBaseUrl.trim()
    ? envBaseUrl.trim()
    : XINGTU_BACKEND_DEFAULT_BASE_URL;
  const normalized = baseUrl.replace(/\/+$/, '');
  return normalized.endsWith('/v1') ? normalized.slice(0, -3) : normalized;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    console.debug('[account-credit] Failed to parse response JSON:', error);
    return text;
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const data = payload as { error?: unknown };
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }
  }
  return fallback;
}

function isAccountCreditUsage(value: unknown): value is AccountCreditUsage {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AccountCreditUsage>;
  return typeof data.principalId === 'string'
    && typeof data.balance === 'number'
    && Array.isArray(data.ledger)
    && data.ledger.every(isAccountCreditLedgerEntry);
}

function isAccountCreditLedgerEntry(value: unknown): value is AccountCreditLedgerEntry {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AccountCreditLedgerEntry>;
  return typeof data.id === 'string'
    && typeof data.delta === 'number'
    && typeof data.balanceAfter === 'number'
    && typeof data.reason === 'string'
    && (typeof data.modelId === 'string' || data.modelId === null)
    && (typeof data.requestType === 'string' || data.requestType === null)
    && (typeof data.requestId === 'string' || data.requestId === null)
    && typeof data.createdAt === 'string';
}
