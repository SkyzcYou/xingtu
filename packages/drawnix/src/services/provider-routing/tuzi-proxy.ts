/**
 * Resolve trusted Tuzi requests to the Xingtu same-origin edge proxy.
 *
 * The resolver intentionally knows only the three public Tuzi origins served
 * by the Cloudflare Worker. Other Tuzi-compatible nodes and arbitrary custom
 * providers remain direct requests.
 */

export const TUZI_PROXY_PATH_PREFIX = '/__tuzi_proxy__/';

export const TUZI_PROXY_ORIGIN_ALIASES = {
  api: 'https://api.tu-zi.com',
  apicdn: 'https://apicdn.tu-zi.com',
  apius: 'https://apius.tu-zi.com',
} as const;

export type TuziProxyUpstreamAlias = keyof typeof TUZI_PROXY_ORIGIN_ALIASES;

const TUZI_PROXY_ORIGIN_TO_ALIAS = new Map<string, TuziProxyUpstreamAlias>(
  Object.entries(TUZI_PROXY_ORIGIN_ALIASES).map(([alias, origin]) => [
    origin,
    alias as TuziProxyUpstreamAlias,
  ])
);

const XINGTU_BROWSER_HOSTNAMES = new Set(['xingtu.live', 'www.xingtu.live']);

interface BrowserLocationLike {
  origin?: string;
  hostname?: string;
  protocol?: string;
}

function getBrowserLocation(): BrowserLocationLike | null {
  // `globalThis.location` is the browser location in production and is easier
  // to stub in unit tests than a read-only jsdom `window.location` object.
  if (
    typeof globalThis !== 'undefined' &&
    'location' in globalThis &&
    globalThis.location
  ) {
    return globalThis.location as BrowserLocationLike;
  }

  if (typeof window !== 'undefined' && window.location) {
    return window.location;
  }

  return null;
}

function getLocationOrigin(location: BrowserLocationLike): string | null {
  if (typeof location.origin === 'string' && location.origin.trim()) {
    return location.origin.trim().replace(/\/$/, '');
  }

  if (
    typeof location.protocol === 'string' &&
    typeof location.hostname === 'string' &&
    location.hostname.trim()
  ) {
    return `${location.protocol}//${location.hostname}`.replace(/\/$/, '');
  }

  return null;
}

/** Whether the current page is one of the production Xingtu origins. */
export function isXingtuBrowserDeployment(): boolean {
  const location = getBrowserLocation();
  const hostname = location?.hostname?.trim().toLowerCase();
  return Boolean(hostname && XINGTU_BROWSER_HOSTNAMES.has(hostname));
}

/** Return the fixed Worker alias for a trusted Tuzi origin. */
export function getTuziProxyUpstreamAlias(
  url: string | URL
): TuziProxyUpstreamAlias | null {
  let parsed: URL;
  try {
    parsed = typeof url === 'string' ? new URL(url) : url;
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') {
    return null;
  }

  return TUZI_PROXY_ORIGIN_TO_ALIAS.get(parsed.origin) || null;
}

/**
 * Convert a trusted Tuzi URL to a same-origin Worker URL in production.
 *
 * Credentials and request policy decisions must be made against the original
 * URL before calling this helper. The helper only rewrites the network URL;
 * non-Tuzi URLs and non-production browser hosts are returned unchanged.
 */
export function resolveTuziProxyRequestUrl(requestUrl: string): string {
  if (!isXingtuBrowserDeployment()) {
    return requestUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(requestUrl);
  } catch {
    return requestUrl;
  }

  const alias = getTuziProxyUpstreamAlias(parsed);
  if (!alias) {
    return requestUrl;
  }

  const location = getBrowserLocation();
  const proxyOrigin = location ? getLocationOrigin(location) : null;
  if (!proxyOrigin) {
    return requestUrl;
  }

  const proxyUrl = new URL(
    `${TUZI_PROXY_PATH_PREFIX}${alias}${
      parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`
    }`,
    proxyOrigin
  );
  proxyUrl.search = parsed.search;
  return proxyUrl.toString();
}
