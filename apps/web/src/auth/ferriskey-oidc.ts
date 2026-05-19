import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';

const DEFAULT_FERRISKEY_BASE_URL = 'https://trust-api.skyzcstack.space';
const DEFAULT_FERRISKEY_REALM = 'xing';
const DEFAULT_FERRISKEY_CLIENT_ID = 'xingtu';
const DEFAULT_SCOPE = 'openid profile email';

function getEnvString(name: string, fallback: string): string {
  const value = import.meta.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function isSafeLocalPath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
}

export const DEFAULT_AUTH_RETURN_URL = '/auth-user.html';

export function getSafeLocalReturnUrl(
  value: unknown,
  fallback = DEFAULT_AUTH_RETURN_URL
): string {
  if (typeof value !== 'string' || !isSafeLocalPath(value)) {
    return fallback;
  }

  return value;
}

export const ferriskeyBaseUrl = trimTrailingSlashes(
  getEnvString('VITE_FERRISKEY_BASE_URL', DEFAULT_FERRISKEY_BASE_URL)
);
export const ferriskeyRealm = getEnvString(
  'VITE_FERRISKEY_REALM',
  DEFAULT_FERRISKEY_REALM
);
export const ferriskeyClientId = getEnvString(
  'VITE_FERRISKEY_CLIENT_ID',
  DEFAULT_FERRISKEY_CLIENT_ID
);
export const ferriskeyAuthority = `${ferriskeyBaseUrl}/realms/${ferriskeyRealm}`;

export const ferriskeyUserManager = new UserManager({
  authority: ferriskeyAuthority,
  client_id: ferriskeyClientId,
  redirect_uri: `${window.location.origin}/auth-callback.html`,
  response_type: 'code',
  scope: getEnvString('VITE_FERRISKEY_SCOPE', DEFAULT_SCOPE),
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  loadUserInfo: true,
  automaticSilentRenew: false,
  metadata: {
    issuer: ferriskeyAuthority,
    authorization_endpoint: `${ferriskeyAuthority}/protocol/openid-connect/auth`,
    token_endpoint: `${ferriskeyAuthority}/protocol/openid-connect/token`,
    userinfo_endpoint: `${ferriskeyAuthority}/protocol/openid-connect/userinfo`,
    end_session_endpoint: `${ferriskeyAuthority}/protocol/openid-connect/logout`,
  },
});

export function isActiveUser(user: User | null): user is User {
  return Boolean(user?.access_token && !user.expired);
}

export function getSafeReturnUrl(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('returnUrl' in state)) {
    return DEFAULT_AUTH_RETURN_URL;
  }

  return getSafeLocalReturnUrl((state as { returnUrl?: unknown }).returnUrl);
}
