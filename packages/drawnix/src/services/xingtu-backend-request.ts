import {
  getFreshOidcAccessToken,
  hasOidcSessionCredential,
} from './auth/oidc-session';
import { XINGTU_BACKEND_DEFAULT_BASE_URL } from '../utils/settings-manager';

export type XingtuBackendAuthMode = 'none' | 'optional' | 'required';

export interface XingtuBackendRequestOptions extends Omit<RequestInit, 'body'> {
  auth?: XingtuBackendAuthMode;
  body?: BodyInit | null;
}

export function getXingtuBackendApiBaseUrl(): string {
  const envBaseUrl = import.meta.env.VITE_XINGTU_BACKEND_BASE_URL;
  const baseUrl = typeof envBaseUrl === 'string' && envBaseUrl.trim()
    ? envBaseUrl.trim()
    : XINGTU_BACKEND_DEFAULT_BASE_URL;
  const normalized = baseUrl.replace(/\/+$/, '');
  return normalized.endsWith('/v1') ? normalized.slice(0, -3) : normalized;
}

export function hasXingtuBackendSession(): boolean {
  return hasOidcSessionCredential();
}

export async function getXingtuBackendAccessToken(
  auth: XingtuBackendAuthMode = 'required'
): Promise<string | null> {
  if (auth === 'none') {
    return null;
  }
  const token = await getFreshOidcAccessToken();
  if (!token && auth === 'required') {
    throw new Error('登录状态已失效，请重新登录');
  }
  return token;
}

export async function xingtuBackendRequest<T>(
  path: string,
  options: XingtuBackendRequestOptions = {}
): Promise<T> {
  const { auth = 'required', headers, ...init } = options;
  const token = await getXingtuBackendAccessToken(auth);
  const shouldSetJsonContentType =
    Boolean(init.body) &&
    !(init.body instanceof FormData) &&
    !(headers && hasContentTypeHeader(headers));
  const response = await fetch(`${getXingtuBackendApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(shouldSetJsonContentType ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `请求失败：${response.status}`));
  }
  return payload as T;
}

function hasContentTypeHeader(headers: HeadersInit): boolean {
  if (headers instanceof Headers) {
    return headers.has('content-type');
  }
  if (Array.isArray(headers)) {
    return headers.some(([name]) => name.toLowerCase() === 'content-type');
  }
  return Object.keys(headers).some((name) => name.toLowerCase() === 'content-type');
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    console.debug('[xingtu-backend] Failed to parse response JSON:', error);
    return text;
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const data = payload as { error?: unknown };
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }
    if (data.error && typeof data.error === 'object') {
      const error = data.error as { message?: unknown };
      if (typeof error.message === 'string' && error.message.trim()) {
        return error.message;
      }
    }
  }
  return fallback;
}
