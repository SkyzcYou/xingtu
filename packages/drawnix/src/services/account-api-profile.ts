import {
  LEGACY_DEFAULT_PROVIDER_PROFILE_ID,
  geminiSettings,
  providerProfilesSettings,
  settingsManager,
} from '../utils/settings-manager';
import { normalizeModelApiBaseUrl } from '../utils/runtime-model-discovery';
import type { ProviderAuthType, ProviderProfile, ProviderType } from '../utils/settings-types';

export interface AccountApiProfile {
  profileId: string;
  profileName: string;
  providerType: ProviderType;
  baseUrl: string;
  authType: ProviderAuthType;
  apiKey: string;
  enabled: boolean;
  isDefault: boolean;
  updatedAt?: string;
}

type UnknownRecord = Record<string, unknown>;

function getDefaultBackendBaseUrl(): string {
  return 'https://api.xingtu.live';
}

function getBackendBaseUrl(): string {
  const value = import.meta.env.VITE_XINGTU_BACKEND_BASE_URL;
  const baseUrl = typeof value === 'string' && value.trim()
    ? value.trim()
    : getDefaultBackendBaseUrl();
  return baseUrl.replace(/\/+$/, '');
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRequiredString(record: UnknownRecord, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`账户配置字段 ${key} 无效`);
  }
  return value.trim();
}

function readOptionalBoolean(record: UnknownRecord, key: string, fallback: boolean): boolean {
  const value = record[key];
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeProviderType(value: string): ProviderType {
  return value === 'openai-compatible' || value === 'gemini-compatible' || value === 'custom'
    ? value
    : 'openai-compatible';
}

function normalizeAuthType(value: string): ProviderAuthType {
  return value === 'bearer' || value === 'header' || value === 'query' || value === 'custom'
    ? value
    : 'bearer';
}

function parseAccountApiProfile(value: unknown): AccountApiProfile {
  if (!isRecord(value)) {
    throw new Error('账户配置响应格式无效');
  }

  const profileId = readRequiredString(value, 'profileId');
  const profileName = readRequiredString(value, 'profileName');
  const baseUrl = readRequiredString(value, 'baseUrl');
  const apiKey = readRequiredString(value, 'apiKey');
  const updatedAt = value.updatedAt;

  return {
    profileId,
    profileName,
    providerType: normalizeProviderType(readRequiredString(value, 'providerType')),
    baseUrl,
    authType: normalizeAuthType(readRequiredString(value, 'authType')),
    apiKey,
    enabled: readOptionalBoolean(value, 'enabled', true),
    isDefault: readOptionalBoolean(value, 'isDefault', true),
    updatedAt: typeof updatedAt === 'string' ? updatedAt : undefined,
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const value = await response.json();
    if (isRecord(value) && typeof value.error === 'string' && value.error.trim()) {
      return value.error.trim();
    }
  } catch {
    console.debug('[account-api-profile] Failed to parse error response');
  }
  return `账户配置请求失败（${response.status}）`;
}

export async function fetchAccountApiProfile(accessToken: string): Promise<AccountApiProfile> {
  const response = await fetch(`${getBackendBaseUrl()}/api/account/api-profile`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (response.status === 401) {
    throw new Error('登录已过期，请重新登录');
  }
  if (response.status === 404) {
    throw new Error('账户尚未绑定 API 配置');
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return parseAccountApiProfile(await response.json());
}

function mergeProfileConfig(
  profile: ProviderProfile,
  accountProfile: AccountApiProfile,
  baseUrl: string,
  apiKey: string
): ProviderProfile {
  return {
    ...profile,
    name: accountProfile.profileName || profile.name,
    providerType: accountProfile.providerType,
    baseUrl,
    apiKey,
    authType: accountProfile.authType,
    enabled: accountProfile.enabled,
  };
}

export async function syncAccountApiProfileToLocalSettings(
  profile: AccountApiProfile
): Promise<void> {
  const baseUrl = normalizeModelApiBaseUrl(profile.baseUrl);
  const apiKey = profile.apiKey.trim();

  if (!apiKey) {
    throw new Error('账户 API Key 为空，无法同步');
  }

  const isLegacyProfile = profile.profileId === LEGACY_DEFAULT_PROVIDER_PROFILE_ID;
  const currentGemini = geminiSettings.get();
  const currentProfiles = providerProfilesSettings.get();
  const nextProfiles = currentProfiles.map((item) => {
    if (item.id === profile.profileId || (isLegacyProfile && item.id === LEGACY_DEFAULT_PROVIDER_PROFILE_ID)) {
      return mergeProfileConfig(item, profile, baseUrl, apiKey);
    }
    return item;
  });

  await settingsManager.updateSettings({
    gemini: isLegacyProfile
      ? {
          ...currentGemini,
          baseUrl,
          apiKey,
        }
      : currentGemini,
    providerProfiles: nextProfiles,
  });
}
