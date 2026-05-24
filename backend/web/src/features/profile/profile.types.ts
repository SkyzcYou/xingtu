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

export interface LlmConfig {
  configured: boolean;
  name: string;
  providerType: string;
  baseUrl: string;
  apiKeyMasked: string;
  apiKeyLast4: string | null;
  enabled: boolean;
  defaultChatModel: string;
  defaultAgentModel: string;
  allowedModels: string[];
  timeoutSeconds: number;
  updatedAt: string | null;
}

export interface UpdateLlmConfigInput {
  name?: string;
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  defaultChatModel: string;
  defaultAgentModel: string;
  allowedModels: string[];
  timeoutSeconds: number;
}

export interface TestLlmConfigResponse {
  endpoint: string;
  model: string;
  status: number;
  latencyMs: number;
}

export interface LlmModelsResponse {
  models: string[];
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

export function isTestLlmConfigResponse(value: unknown): value is TestLlmConfigResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<TestLlmConfigResponse>;
  return (
    typeof data.endpoint === 'string' &&
    typeof data.model === 'string' &&
    typeof data.status === 'number' &&
    typeof data.latencyMs === 'number'
  );
}

export function isLlmModelsResponse(value: unknown): value is LlmModelsResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<LlmModelsResponse>;
  return Array.isArray(data.models) && data.models.every((model) => typeof model === 'string');
}

export function isLlmConfig(value: unknown): value is LlmConfig {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<LlmConfig>;
  return (
    typeof data.configured === 'boolean' &&
    typeof data.name === 'string' &&
    typeof data.providerType === 'string' &&
    typeof data.baseUrl === 'string' &&
    typeof data.apiKeyMasked === 'string' &&
    typeof data.enabled === 'boolean' &&
    typeof data.defaultChatModel === 'string' &&
    typeof data.defaultAgentModel === 'string' &&
    Array.isArray(data.allowedModels) &&
    data.allowedModels.every((model) => typeof model === 'string') &&
    typeof data.timeoutSeconds === 'number'
  );
}
