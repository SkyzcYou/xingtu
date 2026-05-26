import { request } from '../../lib/api/request';
import {
  isHealthResponse,
  isLlmConfig,
  isLlmModelsResponse,
  isTestLlmConfigResponse,
  type HealthResponse,
  type LlmConfig,
  type LlmModelsResponse,
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
