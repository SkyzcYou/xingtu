import { xingtuBackendRequest } from './xingtu-backend-request';

export type PayChannel = 'alipay' | 'wxpay';

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

export interface CreditBalanceResponse {
  principalId: string;
  balance: number;
}

export interface RechargePackage {
  id: string;
  name: string;
  amount: string;
  credits: number;
}

export interface RechargePackagesResponse {
  packages: RechargePackage[];
}

export interface CreateRechargeOrderInput {
  packageId: string;
  payChannel: PayChannel;
  device?: string;
  returnUrl?: string;
}

export interface PaymentOrder {
  outTradeNo: string;
  qingkeTradeNo: string | null;
  apiTradeNo: string | null;
  name: string;
  amount: string;
  payChannel: string;
  status: string;
  creditPackageId: string | null;
  creditAmount: number | null;
  creditedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRechargeOrderResponse {
  order: PaymentOrder;
  payType: string | null;
  payInfo: string | null;
}

export interface RechargeOrdersResponse {
  orders: PaymentOrder[];
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

export async function getAccountCreditBalance(signal?: AbortSignal): Promise<CreditBalanceResponse> {
  const payload = await xingtuBackendRequest<unknown>('/api/credit-balance', {
    auth: 'required',
    signal,
  });
  if (!isCreditBalanceResponse(payload)) {
    throw new Error('当前积分余额响应格式无效');
  }
  return payload;
}

export async function getCreditRechargePackages(signal?: AbortSignal): Promise<RechargePackagesResponse> {
  const payload = await xingtuBackendRequest<unknown>('/api/credit-recharge-packages', {
    auth: 'required',
    signal,
  });
  if (!isRechargePackagesResponse(payload)) {
    throw new Error('充值套餐响应格式无效');
  }
  return payload;
}

export async function createCreditRechargeOrder(
  input: CreateRechargeOrderInput,
  signal?: AbortSignal
): Promise<CreateRechargeOrderResponse> {
  const payload = await xingtuBackendRequest<unknown>('/api/credit-recharge-orders', {
    auth: 'required',
    method: 'POST',
    body: JSON.stringify(input),
    signal,
  });
  if (!isCreateRechargeOrderResponse(payload)) {
    throw new Error('充值订单响应格式无效');
  }
  return payload;
}

export async function getCreditRechargeOrders(signal?: AbortSignal): Promise<RechargeOrdersResponse> {
  const payload = await xingtuBackendRequest<unknown>('/api/credit-recharge-orders', {
    auth: 'required',
    signal,
  });
  if (!isRechargeOrdersResponse(payload)) {
    throw new Error('充值订单列表响应格式无效');
  }
  return payload;
}

export async function queryCreditRechargeOrder(
  outTradeNo: string,
  signal?: AbortSignal
): Promise<PaymentOrder> {
  const payload = await xingtuBackendRequest<unknown>(
    `/api/orders/${encodeURIComponent(outTradeNo)}/query`,
    {
      auth: 'required',
      method: 'POST',
      signal,
    }
  );
  if (!isPaymentOrder(payload)) {
    throw new Error('支付订单查询响应格式无效');
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

function isCreditBalanceResponse(value: unknown): value is CreditBalanceResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<CreditBalanceResponse>;
  return typeof data.principalId === 'string' && typeof data.balance === 'number';
}

function isRechargePackagesResponse(value: unknown): value is RechargePackagesResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<RechargePackagesResponse>;
  return Array.isArray(data.packages) && data.packages.every(isRechargePackage);
}

function isRechargePackage(value: unknown): value is RechargePackage {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<RechargePackage>;
  return typeof data.id === 'string'
    && typeof data.name === 'string'
    && typeof data.amount === 'string'
    && typeof data.credits === 'number';
}

function isCreateRechargeOrderResponse(value: unknown): value is CreateRechargeOrderResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<CreateRechargeOrderResponse>;
  return isPaymentOrder(data.order)
    && (typeof data.payType === 'string' || data.payType === null)
    && (typeof data.payInfo === 'string' || data.payInfo === null);
}

function isRechargeOrdersResponse(value: unknown): value is RechargeOrdersResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<RechargeOrdersResponse>;
  return Array.isArray(data.orders) && data.orders.every(isPaymentOrder);
}

function isPaymentOrder(value: unknown): value is PaymentOrder {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<PaymentOrder>;
  return typeof data.outTradeNo === 'string'
    && (typeof data.qingkeTradeNo === 'string' || data.qingkeTradeNo === null)
    && (typeof data.apiTradeNo === 'string' || data.apiTradeNo === null)
    && typeof data.name === 'string'
    && typeof data.amount === 'string'
    && typeof data.payChannel === 'string'
    && typeof data.status === 'string'
    && (typeof data.creditPackageId === 'string' || data.creditPackageId === null)
    && (typeof data.creditAmount === 'number' || data.creditAmount === null)
    && (typeof data.creditedAt === 'string' || data.creditedAt === null)
    && (typeof data.paidAt === 'string' || data.paidAt === null)
    && typeof data.createdAt === 'string'
    && typeof data.updatedAt === 'string';
}
