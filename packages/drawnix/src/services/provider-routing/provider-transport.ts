import {
  getFreshOidcAccessToken,
  getOidcAccessToken,
} from '../auth/oidc-session';
import type {
  PreparedProviderTransportRequest,
  ProviderBaseUrlStrategy,
  ProviderTransportRequest,
  ResolvedProviderContext,
} from './types';

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function applyBaseUrlStrategy(
  baseUrl: string,
  strategy: ProviderBaseUrlStrategy = 'preserve'
): string {
  const normalizedBaseUrl = trimTrailingSlashes(baseUrl);

  switch (strategy) {
    case 'trim-v1':
      return normalizedBaseUrl.replace(/\/v1$/i, '');
    case 'preserve':
    default:
      return normalizedBaseUrl;
  }
}

function joinUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedBase = trimTrailingSlashes(baseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function buildQueryString(
  query?: Record<string, string | number | boolean | null | undefined>
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || key.trim() === '') {
      continue;
    }
    params.set(key, String(value));
  }

  const result = params.toString();
  return result ? `?${result}` : '';
}

function mergeHeaders(
  baseHeaders?: Record<string, string>,
  overrideHeaders?: Record<string, string>
): Record<string, string> {
  return {
    ...(baseHeaders || {}),
    ...(overrideHeaders || {}),
  };
}

function getProviderCredential(context: ResolvedProviderContext): string {
  return context.credentialSource === 'oidc-session'
    ? getOidcAccessToken() || ''
    : context.apiKey;
}

async function getProviderCredentialAsync(
  context: ResolvedProviderContext
): Promise<string> {
  return context.credentialSource === 'oidc-session'
    ? (await getFreshOidcAccessToken()) || ''
    : context.apiKey;
}

function applyAuthHeadersWithCredential(
  context: ResolvedProviderContext,
  headers: Record<string, string>,
  credential: string
): Record<string, string> {
  if (!credential) {
    return headers;
  }

  switch (context.authType) {
    case 'bearer':
      return { ...headers, Authorization: `Bearer ${credential}` };
    case 'header':
      if (
        headers.Authorization ||
        headers.authorization ||
        headers['X-API-Key'] ||
        headers['x-api-key']
      ) {
        return headers;
      }
      return { ...headers, 'X-API-Key': credential };
    case 'custom':
    case 'query':
    default:
      return headers;
  }
}

function applyAuthHeaders(
  context: ResolvedProviderContext,
  headers: Record<string, string>
): Record<string, string> {
  return applyAuthHeadersWithCredential(
    context,
    headers,
    getProviderCredential(context)
  );
}

function applyAuthQueryWithCredential(
  context: ResolvedProviderContext,
  query: Record<string, string | number | boolean | null | undefined>,
  credential: string
): Record<string, string | number | boolean | null | undefined> {
  if (!credential || context.authType !== 'query') {
    return query;
  }

  if (query.api_key !== undefined || query.key !== undefined) {
    return query;
  }

  const authQueryKey =
    context.providerType === 'gemini-compatible' ? 'key' : 'api_key';

  return {
    ...query,
    [authQueryKey]: credential,
  };
}

function applyAuthQuery(
  context: ResolvedProviderContext,
  query: Record<string, string | number | boolean | null | undefined>
): Record<string, string | number | boolean | null | undefined> {
  return applyAuthQueryWithCredential(
    context,
    query,
    getProviderCredential(context)
  );
}

function createTimeoutSignal(
  upstreamSignal: AbortSignal | undefined,
  timeoutMs: number | undefined
): {
  signal: AbortSignal | undefined;
  didTimeout: () => boolean;
  cleanup: () => void;
} {
  if (!timeoutMs || timeoutMs <= 0) {
    return {
      signal: upstreamSignal,
      didTimeout: () => false,
      cleanup: () => undefined,
    };
  }

  const controller = new AbortController();
  let didTimeout = false;

  const abortFromUpstream = () => {
    controller.abort(upstreamSignal?.reason);
  };

  if (upstreamSignal?.aborted) {
    controller.abort(upstreamSignal.reason);
  } else if (upstreamSignal) {
    upstreamSignal.addEventListener('abort', abortFromUpstream, { once: true });
  }

  const timeoutId = setTimeout(() => {
    didTimeout = true;
    const error = new Error(`Request timeout after ${timeoutMs}ms`);
    error.name = 'TimeoutError';
    controller.abort(error);
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => didTimeout,
    cleanup: () => {
      clearTimeout(timeoutId);
      upstreamSignal?.removeEventListener('abort', abortFromUpstream);
    },
  };
}

export class ProviderTransport {
  private createPreparedRequest(
    context: ResolvedProviderContext,
    request: ProviderTransportRequest,
    credential: string
  ): PreparedProviderTransportRequest {
    const mergedHeaders = mergeHeaders(context.extraHeaders, request.headers);
    const authenticatedHeaders = applyAuthHeadersWithCredential(
      context,
      mergedHeaders,
      credential
    );
    const query = applyAuthQueryWithCredential(
      context,
      request.query || {},
      credential
    );
    const resolvedBaseUrl = applyBaseUrlStrategy(
      context.baseUrl,
      request.baseUrlStrategy
    );
    const url = `${joinUrl(resolvedBaseUrl, request.path)}${buildQueryString(
      query
    )}`;

    return {
      url,
      headers: authenticatedHeaders,
      init: {
        method: request.method || 'GET',
        headers: authenticatedHeaders,
        body: request.body,
        signal: request.signal,
        credentials: request.credentials,
      },
    };
  }

  prepareRequest(
    context: ResolvedProviderContext,
    request: ProviderTransportRequest
  ): PreparedProviderTransportRequest {
    return this.createPreparedRequest(
      context,
      request,
      getProviderCredential(context)
    );
  }

  async prepareRequestAsync(
    context: ResolvedProviderContext,
    request: ProviderTransportRequest
  ): Promise<PreparedProviderTransportRequest> {
    const credential = await getProviderCredentialAsync(context);
    if (context.credentialSource === 'oidc-session' && !credential) {
      throw new Error('请重新登录星图帐号');
    }
    return this.createPreparedRequest(context, request, credential);
  }

  async send(
    context: ResolvedProviderContext,
    request: ProviderTransportRequest
  ): Promise<Response> {
    const timeoutControl = createTimeoutSignal(
      request.signal,
      request.timeoutMs
    );
    const fetcher = request.fetcher || fetch;

    try {
      const prepared = await this.prepareRequestAsync(context, {
        ...request,
        signal: timeoutControl.signal,
      });
      return await fetcher(prepared.url, prepared.init);
    } catch (error) {
      if (timeoutControl.didTimeout()) {
        const timeoutMinutes = Math.floor((request.timeoutMs || 0) / 60000);
        const timeoutError = new Error(
          `请求超时（>${timeoutMinutes} 分钟）`
        );
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      }
      throw error;
    } finally {
      timeoutControl.cleanup();
    }
  }
}

export const providerTransport = new ProviderTransport();
