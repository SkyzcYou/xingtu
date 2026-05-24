import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';
import { panelConfig } from '../env/config';

const DEFAULT_AUTH_RETURN_URL = '/';

function isSafeLocalPath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
}

export function getSafeLocalReturnUrl(
  value: unknown,
  fallback = DEFAULT_AUTH_RETURN_URL
): string {
  if (typeof value !== 'string' || !isSafeLocalPath(value)) {
    return fallback;
  }

  return value;
}

export function getSafeReturnUrl(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('returnUrl' in state)) {
    return DEFAULT_AUTH_RETURN_URL;
  }

  return getSafeLocalReturnUrl((state as { returnUrl?: unknown }).returnUrl);
}

export const consoleAuthority = `${panelConfig.ferriskeyBaseUrl}/realms/${panelConfig.ferriskeyRealm}`;

export const consoleUserManager = new UserManager({
  authority: consoleAuthority,
  client_id: panelConfig.ferriskeyClientId,
  redirect_uri: `${window.location.origin}/auth/callback`,
  response_type: 'code',
  scope: panelConfig.ferriskeyScope,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  loadUserInfo: true,
  automaticSilentRenew: true,
  accessTokenExpiringNotificationTimeInSeconds: 60,
  metadata: {
    issuer: consoleAuthority,
    authorization_endpoint: `${consoleAuthority}/protocol/openid-connect/auth`,
    token_endpoint: `${consoleAuthority}/protocol/openid-connect/token`,
    userinfo_endpoint: `${consoleAuthority}/protocol/openid-connect/userinfo`,
    end_session_endpoint: `${consoleAuthority}/protocol/openid-connect/logout`,
  },
});

export function isActiveUser(user: User | null): user is User {
  return Boolean(user?.access_token && !user.expired);
}

export async function getOidcAccessToken(): Promise<string | null> {
  const user = await consoleUserManager.getUser();
  if (!isActiveUser(user)) return null;
  return user.access_token;
}
