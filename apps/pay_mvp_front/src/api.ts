const API_BASE_URL =
  import.meta.env.VITE_PAYMENT_API_BASE_URL || 'https://api.xingtu.live';

export interface PaymentOrder {
  out_trade_no: string;
  qingke_trade_no?: string | null;
  api_trade_no?: string | null;
  name: string;
  amount: string;
  pay_channel: string;
  status: string;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderPayload {
  name: string;
  amount: string;
  pay_channel: string;
  return_url: string;
}

export interface CreateOrderResponse {
  order: PaymentOrder;
  pay_type?: string | null;
  pay_info?: string | null;
}

export async function createOrder(
  payload: CreateOrderPayload
): Promise<CreateOrderResponse> {
  return request<CreateOrderResponse>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getOrder(outTradeNo: string): Promise<PaymentOrder> {
  return request<PaymentOrder>(`/api/orders/${encodeURIComponent(outTradeNo)}`);
}

export async function queryRemoteOrder(
  outTradeNo: string
): Promise<PaymentOrder> {
  return request<PaymentOrder>(
    `/api/orders/${encodeURIComponent(outTradeNo)}/query`,
    { method: 'POST' }
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || `Request failed: ${response.status}`);
  }

  return data as T;
}
