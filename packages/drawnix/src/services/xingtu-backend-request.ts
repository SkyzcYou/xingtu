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
  const response = await fetch(`${getXingtuBackendApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
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
  }
  return fallback;
}
