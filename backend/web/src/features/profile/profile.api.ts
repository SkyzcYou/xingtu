import { request } from '../../lib/api/request';
import {
  isApiProfile,
  isHealthResponse,
  isLlmConfig,
  isLlmModelsResponse,
  isTestLlmConfigResponse,
  type ApiProfile,
  type HealthResponse,
  type LlmConfig,
  type LlmModelsResponse,
  type ProfileFieldRow,
  type TestLlmConfigResponse,
  type UpdateLlmConfigInput,
} from './profile.types';

export async function getHealth(): Promise<HealthResponse> {
  const response = await request<unknown>('/health', { auth: false });
  if (!isHealthResponse(response)) {
    throw new Error('后端健康检查响应格式无效');
  }
  return response;
}

export async function getApiProfile(): Promise<ApiProfile> {
  const response = await request<unknown>('/api/account/api-profile');
  if (!isApiProfile(response)) {
    throw new Error('账户 API 配置响应格式无效');
  }
  return response;
}

export async function getLlmConfig(): Promise<LlmConfig> {
  const response = await request<unknown>('/api/admin/llm-config');
  if (!isLlmConfig(response)) {
    throw new Error('LLM 配置响应格式无效');
  }
  return response;
}

export async function updateLlmConfig(input: UpdateLlmConfigInput): Promise<LlmConfig> {
  const response = await request<unknown>('/api/admin/llm-config', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  if (!isLlmConfig(response)) {
    throw new Error('LLM 配置保存响应格式无效');
  }
  return response;
}

export async function testLlmConfig(input: UpdateLlmConfigInput): Promise<TestLlmConfigResponse> {
  const response = await request<unknown>('/api/admin/llm-config/test', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!isTestLlmConfigResponse(response)) {
    throw new Error('LLM 配置测试响应格式无效');
  }
  return response;
}

export async function getLlmModels(input: UpdateLlmConfigInput): Promise<LlmModelsResponse> {
  const response = await request<unknown>('/api/admin/llm-config/models', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!isLlmModelsResponse(response)) {
    throw new Error('模型列表响应格式无效');
  }
  return response;
}

export function toProfileRows(profile: ApiProfile): ProfileFieldRow[] {
  return [
    { label: '配置名称', value: profile.profileName },
    { label: 'Profile ID', value: profile.profileId },
    { label: '供应商类型', value: profile.providerType },
    { label: 'Base URL', value: profile.baseUrl },
    { label: '认证方式', value: profile.authType },
    { label: 'API Key', value: profile.apiKey, secret: true },
    {
      label: '启用状态',
      value: profile.enabled ? '已启用' : '已禁用',
      tone: profile.enabled ? 'success' : 'warning',
    },
    {
      label: '默认配置',
      value: profile.isDefault ? '默认' : '非默认',
      tone: profile.isDefault ? 'success' : 'default',
    },
    { label: '更新时间', value: formatDateTime(profile.updatedAt) },
  ];
}

export function formatDateTime(value: string | null): string {
  if (!value) return '未记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
