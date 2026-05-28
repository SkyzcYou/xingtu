import { xingtuBackendRequest } from './xingtu-backend-request';

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
  const payload = await xingtuBackendRequest<unknown>('/api/credit-usage', {
    auth: 'required',
    signal,
  });
  if (!isAccountCreditUsage(payload)) {
    throw new Error('积分信息响应格式无效');
  }
  return payload;
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
