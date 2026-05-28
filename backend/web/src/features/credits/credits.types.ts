export type CreditRequestType = 'chat' | 'image_generation' | 'image_edit' | 'agent';
export type PayChannel = 'alipay' | 'wxpay';

export interface ModelCreditPrice {
  modelId: string;
  requestType: CreditRequestType;
  creditsPerRequest: number;
  enabled: boolean;
  updatedAt: string;
}

export interface CreditPricesResponse {
  prices: ModelCreditPrice[];
}

export interface UpdateCreditPriceInput {
  modelId: string;
  requestType: CreditRequestType;
  creditsPerRequest: number;
  enabled: boolean;
}

export interface UpdateCreditPricesInput {
  prices: UpdateCreditPriceInput[];
}

export interface CreditAccountSummary {
  principalId: string;
  trustSubject: string;
  displayName: string | null;
  email: string | null;
  balance: number;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
}

export interface CreditAccountsResponse {
  accounts: CreditAccountSummary[];
}

export interface CreditLedgerEntry {
  id: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  modelId: string | null;
  requestType: CreditRequestType | null;
  requestId: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface CreditAccountDetailResponse {
  account: CreditAccountSummary;
  ledger: CreditLedgerEntry[];
}

export interface AdjustCreditsInput {
  delta: number;
  note?: string;
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

export const creditRequestTypes: CreditRequestType[] = ['chat', 'image_generation', 'image_edit', 'agent'];

export function isCreditPricesResponse(value: unknown): value is CreditPricesResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<CreditPricesResponse>;
  return Array.isArray(data.prices) && data.prices.every(isModelCreditPrice);
}

export function isCreditAccountsResponse(value: unknown): value is CreditAccountsResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<CreditAccountsResponse>;
  return Array.isArray(data.accounts) && data.accounts.every(isCreditAccountSummary);
}

export function isCreditAccountDetailResponse(value: unknown): value is CreditAccountDetailResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<CreditAccountDetailResponse>;
  return !!data.account && isCreditAccountSummary(data.account) && Array.isArray(data.ledger) && data.ledger.every(isCreditLedgerEntry);
}

export function isCreditBalanceResponse(value: unknown): value is CreditBalanceResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<CreditBalanceResponse>;
  return typeof data.principalId === 'string' && typeof data.balance === 'number';
}

export function isRechargePackagesResponse(value: unknown): value is RechargePackagesResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<RechargePackagesResponse>;
  return Array.isArray(data.packages) && data.packages.every(isRechargePackage);
}

export function isCreateRechargeOrderResponse(value: unknown): value is CreateRechargeOrderResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<CreateRechargeOrderResponse>;
  return isPaymentOrder(data.order) && (typeof data.payType === 'string' || data.payType === null) && (typeof data.payInfo === 'string' || data.payInfo === null);
}

export function isRechargeOrdersResponse(value: unknown): value is RechargeOrdersResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<RechargeOrdersResponse>;
  return Array.isArray(data.orders) && data.orders.every(isPaymentOrder);
}

function isModelCreditPrice(value: unknown): value is ModelCreditPrice {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<ModelCreditPrice>;
  return typeof data.modelId === 'string' && isCreditRequestType(data.requestType) && typeof data.creditsPerRequest === 'number' && typeof data.enabled === 'boolean' && typeof data.updatedAt === 'string';
}

function isCreditAccountSummary(value: unknown): value is CreditAccountSummary {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<CreditAccountSummary>;
  return typeof data.principalId === 'string' && typeof data.trustSubject === 'string' && (typeof data.displayName === 'string' || data.displayName === null) && (typeof data.email === 'string' || data.email === null) && typeof data.balance === 'number' && (typeof data.lastLoginAt === 'string' || data.lastLoginAt === null) && (typeof data.lastActivityAt === 'string' || data.lastActivityAt === null);
}

function isCreditLedgerEntry(value: unknown): value is CreditLedgerEntry {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<CreditLedgerEntry>;
  return typeof data.id === 'string' && typeof data.delta === 'number' && typeof data.balanceAfter === 'number' && typeof data.reason === 'string' && (typeof data.modelId === 'string' || data.modelId === null) && (isCreditRequestType(data.requestType) || data.requestType === null) && (typeof data.requestId === 'string' || data.requestId === null) && typeof data.createdAt === 'string';
}

function isRechargePackage(value: unknown): value is RechargePackage {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<RechargePackage>;
  return typeof data.id === 'string' && typeof data.name === 'string' && typeof data.amount === 'string' && typeof data.credits === 'number';
}

export function isPaymentOrder(value: unknown): value is PaymentOrder {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<PaymentOrder>;
  return typeof data.outTradeNo === 'string' && typeof data.name === 'string' && typeof data.amount === 'string' && typeof data.payChannel === 'string' && typeof data.status === 'string' && (typeof data.creditPackageId === 'string' || data.creditPackageId === null) && (typeof data.creditAmount === 'number' || data.creditAmount === null) && (typeof data.creditedAt === 'string' || data.creditedAt === null) && (typeof data.paidAt === 'string' || data.paidAt === null) && typeof data.createdAt === 'string' && typeof data.updatedAt === 'string';
}

function isCreditRequestType(value: unknown): value is CreditRequestType {
  return typeof value === 'string' && creditRequestTypes.includes(value as CreditRequestType);
}
