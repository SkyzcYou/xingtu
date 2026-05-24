import { getOidcAccessToken } from '../../lib/auth/console-oidc';
import { ApiError, getErrorMessage } from '../../lib/api/errors';
import { request } from '../../lib/api/request';
import { panelConfig } from '../../lib/env/config';

export interface PlaygroundMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionChoice {
  message?: {
    content?: unknown;
  };
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
}

interface ModelListResponse {
  data?: Array<{ id?: unknown }>;
}

interface ImageGenerationData {
  url?: unknown;
  b64_json?: unknown;
  revised_prompt?: unknown;
}

interface ImageGenerationResponse {
  data?: ImageGenerationData[];
}

export interface PlaygroundImageResult {
  src: string;
  revisedPrompt?: string;
}

export async function getGatewayModels(): Promise<string[]> {
  const response = await request<unknown>('/v1/models');
  const models = (response as ModelListResponse).data
    ?.map((model) => model.id)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    .map((id) => id.trim()) ?? [];
  return Array.from(new Set(models)).sort();
}

export async function generateImage(input: {
  model: string;
  prompt: string;
  size: string;
  referenceImages: File[];
}): Promise<PlaygroundImageResult[]> {
  const payload = input.referenceImages.length > 0 ? buildImageEditForm(input) : JSON.stringify({
    model: input.model,
    prompt: input.prompt,
    size: input.size,
  });
  const response = await rawRequest<unknown>(
    input.referenceImages.length > 0 ? '/v1/images/edits' : '/v1/images/generations',
    {
      method: 'POST',
      body: payload,
      headers: payload instanceof FormData ? undefined : { 'content-type': 'application/json' },
    }
  );
  const images = parseImageGenerationResponse(response);
  if (images.length === 0) {
    throw new Error('图片生成响应格式无效');
  }
  return images;
}

export async function sendChatCompletion(input: {
  model: string;
  messages: PlaygroundMessage[];
}): Promise<string> {
  const response = await request<unknown>('/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      stream: false,
    }),
  });

  const content = (response as ChatCompletionResponse).choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('模型响应格式无效');
  }
  return content;
}

function buildImageEditForm(input: {
  model: string;
  prompt: string;
  size: string;
  referenceImages: File[];
}): FormData {
  const form = new FormData();
  form.append('model', input.model);
  form.append('prompt', input.prompt);
  form.append('size', input.size);
  input.referenceImages.forEach((file) => {
    form.append('image', file, file.name);
  });
  return form;
}

function parseImageGenerationResponse(response: unknown): PlaygroundImageResult[] {
  const data = (response as ImageGenerationResponse).data ?? [];
  return data.flatMap((item) => {
    if (typeof item.url === 'string' && item.url) {
      return [{ src: item.url, revisedPrompt: stringOrUndefined(item.revised_prompt) }];
    }
    if (typeof item.b64_json === 'string' && item.b64_json) {
      return [{ src: `data:image/png;base64,${item.b64_json}`, revisedPrompt: stringOrUndefined(item.revised_prompt) }];
    }
    return [];
  });
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

async function rawRequest<T>(path: string, options: RequestInit): Promise<T> {
  const token = await getOidcAccessToken();
  if (!token) {
    throw new ApiError('需要登录后访问', 401, null);
  }
  const response = await fetch(`${panelConfig.apiBaseUrl}${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const text = await response.text();
  const payload = parsePayload(text);
  if (!response.ok) {
    throw new ApiError(getErrorMessage(payload, `请求失败：${response.status}`), response.status, payload);
  }
  return payload as T;
}

function parsePayload(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    console.debug('Failed to parse response JSON', error);
    return text;
  }
}
