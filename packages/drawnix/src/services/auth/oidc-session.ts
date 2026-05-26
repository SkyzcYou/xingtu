import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';

export type OidcSessionStatus = 'signed-in' | 'signed-out' | 'expired';

export interface OidcProfileViewModel {
  status: OidcSessionStatus;
  displayName: string;
  email: string;
  subject: string;
  tokenType: string;
  expiresAtText: string;
  roles: string[];
  avatarSeed: string;
  hasAccessToken: boolean;
}

type UnknownRecord = Record<string, unknown>;

interface StoredOidcUser {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_at?: number;
  profile?: UnknownRecord;
}

const DEFAULT_FERRISKEY_BASE_URL = 'https://trust-api.skyzcstack.space';
const DEFAULT_FERRISKEY_REALM = 'xing';
const DEFAULT_FERRISKEY_CLIENT_ID = 'xingtu';
const OIDC_USER_KEY_PREFIX = 'oidc.user:';
const AUTH_LOGIN_PATH = '/auth-login.html';
const AUTH_RETURN_URL_PARAM = 'returnUrl';
const PROFILE_PANEL_RETURN_PARAM = 'profilePanel';
const PROFILE_PANEL_RETURN_VALUE = '1';
const TOKEN_REFRESH_SKEW_SECONDS = 30;

let oidcUserManager: UserManager | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function buildOidcLoginUrl(options: { profilePanel?: boolean } = {}): string {
  if (typeof window === 'undefined') {
    return AUTH_LOGIN_PATH;
  }

  const returnUrl = new URL(window.location.href);
  if (options.profilePanel) {
    returnUrl.searchParams.set(PROFILE_PANEL_RETURN_PARAM, PROFILE_PANEL_RETURN_VALUE);
  }
  const returnPath = `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
  const loginUrl = new URL(AUTH_LOGIN_PATH, window.location.origin);
  loginUrl.searchParams.set(AUTH_RETURN_URL_PARAM, returnPath);
  return `${loginUrl.pathname}${loginUrl.search}`;
}

function getEnvString(name: string, fallback: string): string {
  const value = import.meta.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function getFerriskeyAuthority(): string {
  const baseUrl = trimTrailingSlashes(
    getEnvString('VITE_FERRISKEY_BASE_URL', DEFAULT_FERRISKEY_BASE_URL)
  );
  const realm = getEnvString('VITE_FERRISKEY_REALM', DEFAULT_FERRISKEY_REALM);
  return `${baseUrl}/realms/${realm}`;
}

function getFerriskeyClientId(): string {
  return getEnvString('VITE_FERRISKEY_CLIENT_ID', DEFAULT_FERRISKEY_CLIENT_ID);
}

function getExpectedUserKey(): string {
  return `${OIDC_USER_KEY_PREFIX}${getFerriskeyAuthority()}:${getFerriskeyClientId()}`;
}

function getOidcUserManager(): UserManager | null {
  if (typeof window === 'undefined') {
    return null;
  }
  if (oidcUserManager) {
    return oidcUserManager;
  }

  const authority = getFerriskeyAuthority();
  oidcUserManager = new UserManager({
    authority,
    client_id: getFerriskeyClientId(),
    redirect_uri: `${window.location.origin}/auth-callback.html`,
    response_type: 'code',
    scope: getEnvString('VITE_FERRISKEY_SCOPE', 'openid profile email offline_access'),
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    loadUserInfo: true,
    automaticSilentRenew: false,
    metadata: {
      issuer: authority,
      authorization_endpoint: `${authority}/protocol/openid-connect/auth`,
      token_endpoint: `${authority}/protocol/openid-connect/token`,
      userinfo_endpoint: `${authority}/protocol/openid-connect/userinfo`,
      end_session_endpoint: `${authority}/protocol/openid-connect/logout`,
    },
  });

  return oidcUserManager;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStoredOidcUser(value: unknown): value is StoredOidcUser {
  return isRecord(value) && isRecord(value.profile);
}

function parseStoredUser(raw: string | null): StoredOidcUser | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isStoredOidcUser(parsed) ? parsed : null;
  } catch (error) {
    console.debug('[oidc-session] Failed to parse stored user:', error);
    return null;
  }
}

function getStorageKeyCandidates(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const expectedKey = getExpectedUserKey();
  const authority = getFerriskeyAuthority();
  const keys = Object.keys(window.sessionStorage).filter((key) =>
    key.startsWith(OIDC_USER_KEY_PREFIX)
  );

  return [
    expectedKey,
    ...keys.filter((key) => key !== expectedKey && key.includes(authority)),
    ...keys.filter((key) => key !== expectedKey && !key.includes(authority)),
  ];
}

function readStoredUser(): StoredOidcUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  for (const key of getStorageKeyCandidates()) {
    const user = parseStoredUser(window.sessionStorage.getItem(key));
    if (user) {
      return user;
    }
  }

  return null;
}

function toText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = toText(value);
    if (text) {
      return text;
    }
  }
  return '';
}

function addRolesFromValue(
  roles: Set<string>,
  prefix: string,
  value: unknown
): void {
  if (!isRecord(value) || !Array.isArray(value.roles)) {
    return;
  }

  for (const role of value.roles) {
    if (typeof role === 'string' && role.trim()) {
      roles.add(prefix ? `${prefix}:${role.trim()}` : role.trim());
    }
  }
}

function collectRoles(profile: UnknownRecord): string[] {
  const roles = new Set<string>();
  addRolesFromValue(roles, '', profile.realm_access);

  if (isRecord(profile.resource_access)) {
    for (const [client, access] of Object.entries(profile.resource_access)) {
      addRolesFromValue(roles, client, access);
    }
  }

  return Array.from(roles).sort();
}

function getStatus(user: StoredOidcUser | null): OidcSessionStatus {
  if (!user) {
    return 'signed-out';
  }
  if (user.expires_at && user.expires_at <= Date.now() / 1000) {
    return 'expired';
  }
  return user.access_token ? 'signed-in' : 'signed-out';
}

function isUserRefreshable(user: StoredOidcUser | null): boolean {
  return Boolean(user?.refresh_token);
}

function isAccessTokenFresh(
  user: Pick<User, 'access_token' | 'expires_at'> | null
): boolean {
  if (!user?.access_token || !user.expires_at) {
    return false;
  }
  return user.expires_at - Date.now() / 1000 > TOKEN_REFRESH_SKEW_SECONDS;
}

async function refreshOidcAccessToken(): Promise<string | null> {
  const manager = getOidcUserManager();
  if (!manager) {
    return null;
  }

  const user = await manager.getUser();
  if (isAccessTokenFresh(user)) {
    return user?.access_token || null;
  }
  if (!user?.refresh_token) {
    return null;
  }

  try {
    const renewed = await manager.signinSilent();
    return renewed?.access_token || null;
  } catch (error) {
    console.debug('[oidc-session] Silent token refresh failed:', error);
    return null;
  }
}

function formatExpiresAt(expiresAt: number | undefined): string {
  if (!expiresAt) {
    return '未知';
  }
  return new Date(expiresAt * 1000).toLocaleString();
}

export function loadOidcProfileViewModel(): OidcProfileViewModel {
  const user = readStoredUser();
  const profile = user?.profile || {};
  const displayName = firstText(
    profile.preferred_username,
    profile.name,
    profile.email,
    profile.sub
  );
  const subject = firstText(profile.sub);
  const email = firstText(profile.email);

  return {
    status: getStatus(user),
    displayName: displayName || '未知用户',
    email: email || '未提供',
    subject: subject || '未提供',
    tokenType: user?.token_type || '未知',
    expiresAtText: formatExpiresAt(user?.expires_at),
    roles: collectRoles(profile),
    avatarSeed: subject || displayName || email || 'xingtu-profile',
    hasAccessToken: Boolean(user?.access_token),
  };
}

export function getOidcAccessToken(): string | null {
  const user = readStoredUser();
  if (getStatus(user) !== 'signed-in') {
    return null;
  }
  return user?.access_token || null;
}

export function hasOidcSessionCredential(): boolean {
  const user = readStoredUser();
  return getStatus(user) === 'signed-in' || isUserRefreshable(user);
}

export async function getFreshOidcAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = refreshOidcAccessToken().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export function clearOidcSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  for (const key of Object.keys(window.sessionStorage)) {
    if (key.startsWith(OIDC_USER_KEY_PREFIX)) {
      window.sessionStorage.removeItem(key);
    }
  }
}
