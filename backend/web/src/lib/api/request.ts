import { getOidcAccessToken } from '../auth/console-oidc';
import { panelConfig } from '../env/config';
import { ApiError, getErrorMessage } from './errors';

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...init } = options;
  const token = auth ? await getOidcAccessToken() : null;

  if (auth && !token) {
    throw new ApiError('需要登录后访问', 401, null);
  }

  const response = await fetch(`${panelConfig.apiBaseUrl}${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const text = await response.text();
  const payload = parsePayload(text);

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(payload, `请求失败：${response.status}`),
      response.status,
      payload
    );
  }

  return payload as T;
}

function parsePayload(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    console.debug('Failed to parse response JSON', error);
    return text;
  }
}
