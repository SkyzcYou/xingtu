interface PanelConfig {
  apiBaseUrl: string;
  ferriskeyBaseUrl: string;
  ferriskeyRealm: string;
  ferriskeyClientId: string;
  ferriskeyScope: string;
  adminRequiredRole: string;
}

const DEFAULT_API_BASE_URL = 'https://api.xingtu.live';
const DEFAULT_FERRISKEY_BASE_URL = 'https://trust-api.skyzcstack.space';
const DEFAULT_FERRISKEY_REALM = 'xing';
const DEFAULT_FERRISKEY_CLIENT_ID = 'xingtu-console';
const DEFAULT_FERRISKEY_SCOPE = 'openid profile email offline_access';

function getEnvString(name: string, fallback: string): string {
  const value = import.meta.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export const panelConfig: PanelConfig = {
  apiBaseUrl: normalizeBaseUrl(getEnvString('VITE_API_BASE_URL', DEFAULT_API_BASE_URL)),
  ferriskeyBaseUrl: normalizeBaseUrl(
    getEnvString('VITE_FERRISKEY_BASE_URL', DEFAULT_FERRISKEY_BASE_URL)
  ),
  ferriskeyRealm: getEnvString('VITE_FERRISKEY_REALM', DEFAULT_FERRISKEY_REALM),
  ferriskeyClientId: getEnvString(
    'VITE_FERRISKEY_CLIENT_ID',
    DEFAULT_FERRISKEY_CLIENT_ID
  ),
  ferriskeyScope: getEnvString('VITE_FERRISKEY_SCOPE', DEFAULT_FERRISKEY_SCOPE),
  adminRequiredRole: getEnvString('VITE_ADMIN_REQUIRED_ROLE', ''),
};
