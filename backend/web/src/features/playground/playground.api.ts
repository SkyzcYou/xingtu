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

interface ImageJobResponse {
  id: string;
  job_id?: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  result?: { body?: unknown } | null;
  error?: unknown;
}

interface ImageJobSubmitResponse {
  job_id: string;
  job: ImageJobResponse;
}

export type PlaygroundImageMode = 'sync' | 'async';

export interface PlaygroundImageResult {
  src: string;
  revisedPrompt?: string;
  jobId?: string;
}

interface ImageGenerationInput {
  model: string;
  prompt: string;
  aspectRatio: string;
  resolutionTier: string;
  quality: string;
  count: number;
  referenceImages: File[];
  mode: PlaygroundImageMode;
}

interface ImageRequestFields {
  aspect_ratio: string;
  output_resolution: string;
  image_size: string;
  quality: string;
  n: number;
  stream: false;
}

export async function getGatewayModels(): Promise<string[]> {
  const response = await request<unknown>('/v1/models');
  const models = (response as ModelListResponse).data
    ?.map((model) => model.id)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    .map((id) => id.trim()) ?? [];
  return Array.from(new Set(models)).sort();
}

export async function generateImage(input: ImageGenerationInput): Promise<PlaygroundImageResult[]> {
  return input.mode === 'async'
    ? generateImageAsync(input)
    : generateImageSync(input);
}

async function generateImageSync(input: ImageGenerationInput): Promise<PlaygroundImageResult[]> {
  const payload = buildImagePayload(input);
  const response = await rawRequest<unknown>(
    input.referenceImages.length > 0 ? '/v1/images/edits' : '/v1/images/generations',
    {
      method: 'POST',
      body: payload,
      headers: payload instanceof FormData ? undefined : { 'content-type': 'application/json' },
    }
  );
  return parseNonEmptyImageResponse(response);
}

async function generateImageAsync(input: ImageGenerationInput): Promise<PlaygroundImageResult[]> {
  const payload = buildImagePayload(input, { async: true });
  const submit = await rawRequest<ImageJobSubmitResponse>(
    input.referenceImages.length > 0 ? '/v1/images/edits' : '/v1/images/generations',
    {
      method: 'POST',
      body: payload,
      headers: payload instanceof FormData ? undefined : { 'content-type': 'application/json' },
    }
  );
  const completed = await pollImageJob(submit.job_id);
  return parseNonEmptyImageResponse(completed.result?.body).map((item) => ({
    ...item,
    jobId: completed.job_id || completed.id,
  }));
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

function buildImagePayload(
  input: ImageGenerationInput,
  options?: { async?: boolean }
): FormData | string {
  return input.referenceImages.length > 0
    ? buildImageEditForm(input, options)
    : JSON.stringify({
        model: input.model,
        prompt: input.prompt,
        ...buildImageRequestFields(input),
        ...(options?.async ? { async: true } : {}),
      });
}

function buildImageEditForm(
  input: ImageGenerationInput,
  options?: { async?: boolean }
): FormData {
  const form = new FormData();
  const fields = buildImageRequestFields(input);
  form.append('model', input.model);
  form.append('prompt', input.prompt);
  form.append('aspect_ratio', fields.aspect_ratio);
  form.append('output_resolution', fields.output_resolution);
  form.append('image_size', fields.image_size);
  form.append('quality', fields.quality);
  form.append('n', String(fields.n));
  form.append('stream', 'false');
  if (options?.async) {
    form.append('async', 'true');
  }
  input.referenceImages.forEach((file) => {
    form.append('image', file, file.name);
  });
  return form;
}

function buildImageRequestFields(input: ImageGenerationInput): ImageRequestFields {
  return {
    aspect_ratio: input.aspectRatio,
    output_resolution: input.resolutionTier,
    image_size: input.resolutionTier,
    quality: input.quality,
    n: input.count,
    stream: false,
  };
}

async function pollImageJob(id: string): Promise<ImageJobResponse> {
  const maxAttempts = 240;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const job = await rawRequest<ImageJobResponse>(`/v1/images/generations/${id}`, {
      method: 'GET',
    });
    if (job.status === 'succeeded') {
      return job;
    }
    if (job.status === 'failed' || job.status === 'cancelled') {
      throw new Error(readJobError(job.error));
    }
    await sleep(3000);
  }
  throw new Error('异步图片任务轮询超时');
}

function parseNonEmptyImageResponse(response: unknown): PlaygroundImageResult[] {
  const images = parseImageGenerationResponse(response);
  if (images.length === 0) {
    throw new Error('图片生成响应格式无效');
  }
  return images;
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

function readJobError(error: unknown): string {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  if (error && typeof error === 'object') {
    const data = error as { message?: unknown };
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }
  }
  return '异步图片任务失败';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
