import { request } from '../../lib/api/request';
import {
  isCreateRechargeOrderResponse,
  isCreditAccountDetailResponse,
  isCreditAccountsResponse,
  isCreditBalanceResponse,
  isCreditPricesResponse,
  isCreditSettingsResponse,
  isPaymentOrder,
  isRechargeOrdersResponse,
  isRechargePackagesResponse,
  type AdjustCreditsInput,
  type CreateRechargeOrderInput,
  type CreateRechargeOrderResponse,
  type CreditAccountDetailResponse,
  type CreditAccountsResponse,
  type CreditBalanceResponse,
  type CreditPricesResponse,
  type CreditSettingsResponse,
  type RechargeOrdersResponse,
  type RechargePackagesResponse,
  type UpdateCreditPricesInput,
  type UpdateCreditSettingsInput,
} from './credits.types';

export async function getCreditSettings(): Promise<CreditSettingsResponse> {
  const response = await request<unknown>('/api/admin/credit-settings');
  if (!isCreditSettingsResponse(response)) {
    throw new Error('积分设置响应格式无效');
  }
  return response;
}

export async function updateCreditSettings(input: UpdateCreditSettingsInput): Promise<CreditSettingsResponse> {
  const response = await request<unknown>('/api/admin/credit-settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  if (!isCreditSettingsResponse(response)) {
    throw new Error('积分设置保存响应格式无效');
  }
  return response;
}

export async function getCreditPrices(): Promise<CreditPricesResponse> {
  const response = await request<unknown>('/api/admin/credit-prices');
  if (!isCreditPricesResponse(response)) {
    throw new Error('积分价格响应格式无效');
  }
  return response;
}

export async function updateCreditPrices(input: UpdateCreditPricesInput): Promise<CreditPricesResponse> {
  const response = await request<unknown>('/api/admin/credit-prices', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  if (!isCreditPricesResponse(response)) {
    throw new Error('积分价格保存响应格式无效');
  }
  return response;
}

export async function getCreditAccounts(query: string): Promise<CreditAccountsResponse> {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set('query', query.trim());
  }
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await request<unknown>(`/api/admin/credit-accounts${suffix}`);
  if (!isCreditAccountsResponse(response)) {
    throw new Error('积分账号响应格式无效');
  }
  return response;
}

export async function getCreditAccountDetail(principalId: string): Promise<CreditAccountDetailResponse> {
  const response = await request<unknown>(`/api/admin/credit-accounts/${principalId}`);
  if (!isCreditAccountDetailResponse(response)) {
    throw new Error('积分账号详情响应格式无效');
  }
  return response;
}

export async function adjustCredits(principalId: string, input: AdjustCreditsInput): Promise<CreditAccountDetailResponse> {
  const response = await request<unknown>(`/api/admin/credit-accounts/${principalId}/adjustments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!isCreditAccountDetailResponse(response)) {
    throw new Error('积分调整响应格式无效');
  }
  return response;
}

export async function getCreditBalance(): Promise<CreditBalanceResponse> {
  const response = await request<unknown>('/api/credit-balance');
  if (!isCreditBalanceResponse(response)) {
    throw new Error('当前积分余额响应格式无效');
  }
  return response;
}

export async function getRechargePackages(): Promise<RechargePackagesResponse> {
  const response = await request<unknown>('/api/credit-recharge-packages');
  if (!isRechargePackagesResponse(response)) {
    throw new Error('充值套餐响应格式无效');
  }
  return response;
}

export async function createRechargeOrder(input: CreateRechargeOrderInput): Promise<CreateRechargeOrderResponse> {
  const response = await request<unknown>('/api/credit-recharge-orders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!isCreateRechargeOrderResponse(response)) {
    throw new Error('充值订单响应格式无效');
  }
  return response;
}

export async function getRechargeOrders(): Promise<RechargeOrdersResponse> {
  const response = await request<unknown>('/api/credit-recharge-orders');
  if (!isRechargeOrdersResponse(response)) {
    throw new Error('充值订单列表响应格式无效');
  }
  return response;
}

export async function queryPaymentOrder(outTradeNo: string): Promise<CreateRechargeOrderResponse['order']> {
  const response = await request<unknown>(`/api/orders/${outTradeNo}/query`, { method: 'POST' });
  if (!isPaymentOrder(response)) {
    throw new Error('支付订单查询响应格式无效');
  }
  return response;
}
