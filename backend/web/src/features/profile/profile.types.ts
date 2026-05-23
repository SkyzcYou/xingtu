export interface HealthResponse {
  status: string;
}

export interface ApiProfile {
  profileId: string;
  profileName: string;
  providerType: string;
  baseUrl: string;
  authType: string;
  apiKey: string;
  enabled: boolean;
  isDefault: boolean;
  updatedAt: string;
}

export interface ProfileFieldRow {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning';
  secret?: boolean;
}

export function isHealthResponse(value: unknown): value is HealthResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<HealthResponse>;
  return typeof data.status === 'string';
}

export function isApiProfile(value: unknown): value is ApiProfile {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<ApiProfile>;
  return (
    typeof data.profileId === 'string' &&
    typeof data.profileName === 'string' &&
    typeof data.providerType === 'string' &&
    typeof data.baseUrl === 'string' &&
    typeof data.authType === 'string' &&
    typeof data.apiKey === 'string' &&
    typeof data.enabled === 'boolean' &&
    typeof data.isDefault === 'boolean' &&
    typeof data.updatedAt === 'string'
  );
}
