/**
 * Async Image API Service
 *
 * Handles async image generation for nano-banana-pro models (异步香蕉格式)。
 * 提交任务后通过轮询查询结果，返回图片下载链接。
 */

import {
  resolveInvocationRoute,
  XINGTU_LOGIN_PROVIDER_PROFILE_ID,
  type ModelRef,
} from '../utils/settings-manager';
import { normalizeImageDataUrl } from '@aitu/utils';
import {
  providerTransport,
  resolveInvocationPlanFromRoute,
  type ProviderAuthStrategy,
  type ResolvedProviderContext,
} from './provider-routing';
import { IMAGE_GENERATION_TIMEOUT_MS } from '../constants/TASK_CONSTANTS';
import { xingtuBackendRequest } from './xingtu-backend-request';

function getFileExtension(url: string): string | null {
  const pathname = url.split('?')[0] || '';
  const match = pathname.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() || null;
}

export interface AsyncImageGenerationParams {
  model: string;
  modelRef?: ModelRef | null;
  prompt: string;
  size?: string; // 接口的尺寸/比例字段（枚举 1:1、4:5 等）
  referenceImages?: string[];
  maskImage?: string;
}

export interface AsyncImageSubmitResponse {
  id: string;
  object: string;
  model: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  created_at: number;
  error?: string | { code: string; message: string };
}

export interface AsyncImageQueryResponse {
  id: string;
  object: string;
  model: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  created_at: number;
  video_url?: string; // 实际为图片地址，沿用接口字段
  url?: string;
  urls?: string[];
  format?: string;
  error?: string | { code: string; message: string };
}

interface PollingOptions {
  interval?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
  requestId?: string;
  onSubmissionAttempt?: () => void | Promise<void>;
  onProgress?: (progress: number, status: string) => void;
  onSubmitted?: (taskId: string) => void | Promise<void>;
  routeModel?: string | ModelRef | null;
}

interface XingtuBackendImageJob {
  id: string;
  job_id?: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  modelId: string;
  requestType: string;
  result?: {
    body?: unknown;
    statusCode?: number;
  } | null;
  error?: string | { code?: string; message?: string } | null;
  createdAt: string;
}

interface XingtuBackendImageJobSubmitResponse {
  job_id: string;
  status: string;
  job: XingtuBackendImageJob;
}

class AsyncImageTaskFailedError extends Error {}

function getDefaultImagePollingMaxAttempts(interval: number): number {
  return Math.ceil(IMAGE_GENERATION_TIMEOUT_MS / Math.max(interval, 1));
}

function inferAuthType(route: ReturnType<typeof resolveInvocationRoute>): ProviderAuthStrategy {
  return route.authType;
}

function isXingtuAccountProvider(provider: ResolvedProviderContext): boolean {
  return (
    provider.profileId === XINGTU_LOGIN_PROVIDER_PROFILE_ID &&
    provider.credentialSource === 'oidc-session'
  );
}

function mapXingtuJobStatus(
  status: XingtuBackendImageJob['status']
): AsyncImageQueryResponse['status'] {
  if (status === 'succeeded') return 'completed';
  if (status === 'failed' || status === 'cancelled') return 'failed';
  if (status === 'running') return 'in_progress';
  return 'queued';
}

function getXingtuJobCreatedAt(job: XingtuBackendImageJob): number {
  const timestamp = Date.parse(job.createdAt);
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : 0;
}

function getXingtuJobError(
  job: XingtuBackendImageJob
): AsyncImageQueryResponse['error'] {
  if (!job.error) return undefined;
  if (typeof job.error === 'string') return job.error;
  return {
    code: job.error.code || 'image_job_failed',
    message: job.error.message || '图片生成失败',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeXingtuImageValue(
  value: unknown,
  fallbackFormat = 'png'
): string | undefined {
  const raw = getString(value);
  if (!raw) return undefined;
  return normalizeImageDataUrl(raw, `image/${fallbackFormat}`);
}

function extractXingtuImageUrls(body: unknown): {
  url?: string;
  urls?: string[];
  format?: string;
} {
  if (!isRecord(body)) return {};
  const formatHint = getString(body.output_format) || 'png';
  const data = Array.isArray(body.data) ? body.data : [];
  const urls = data
    .filter(isRecord)
    .map((item) =>
      normalizeXingtuImageValue(item.url || item.b64_json, formatHint)
    )
    .filter(Boolean) as string[];
  const fallbackUrl = normalizeXingtuImageValue(
    body.url || body.video_url,
    formatHint
  );
  const allUrls = urls.length ? urls : fallbackUrl ? [fallbackUrl] : [];
  const url = allUrls[0];
  const extension = url ? getFileExtension(url) : null;
  const format = extension && extension !== 'bin' ? extension : formatHint;
  return {
    url,
    urls: allUrls.length > 1 ? allUrls : undefined,
    format,
  };
}

function normalizeXingtuJob(job: XingtuBackendImageJob): AsyncImageQueryResponse {
  const imageResult = extractXingtuImageUrls(job.result?.body);
  return {
    id: job.job_id || job.id,
    object: 'image.generation.job',
    model: job.modelId,
    status: mapXingtuJobStatus(job.status),
    progress:
      job.status === 'succeeded' || job.status === 'failed' || job.status === 'cancelled'
        ? 100
        : job.status === 'running'
        ? 50
        : 0,
    created_at: getXingtuJobCreatedAt(job),
    url: imageResult.url,
    urls: imageResult.urls,
    video_url: imageResult.url,
    format: imageResult.format,
    error: getXingtuJobError(job),
  };
}

function resolveProviderContext(
  routeModel?: string | ModelRef | null
): ResolvedProviderContext {
  const plan = resolveInvocationPlanFromRoute('image', routeModel);
  if (plan) {
    return plan.provider;
  }

  const route = resolveInvocationRoute('image', routeModel);
  return {
    profileId: route.profileId || 'runtime',
    profileName: route.profileName || 'Runtime',
    providerType: route.providerType || 'custom',
    baseUrl: route.baseUrl,
    apiKey: route.apiKey,
    authType: inferAuthType(route),
    credentialSource: route.credentialSource,
  };
}

function isLocalResolvableImage(value: string): boolean {
  return (
    value.startsWith('/__aitu_cache__/') || value.startsWith('/asset-library/')
  );
}

async function normalizeImageFormValue(value: string): Promise<string> {
  if (!isLocalResolvableImage(value)) {
    return value;
  }

  const { unifiedCacheService } = await import('./unified-cache-service');
  const imageData = await unifiedCacheService.getImageForAI(value);
  return imageData.value;
}

function addAsyncFlagToJsonBody(body: string): string {
  const payload = JSON.parse(body) as Record<string, unknown>;
  return JSON.stringify({ ...payload, async: true });
}

async function appendReferenceImage(
  formData: FormData,
  field: 'input_reference' | 'mask',
  value: string,
  index: number
): Promise<void> {
  const normalized = normalizeImageDataUrl(
    await normalizeImageFormValue(value)
  );
  try {
    const match = normalized.match(/^data:([^;,]+)?;base64,(.*)$/);
    if (match) {
      const mimeType = match[1] || 'image/png';
      const binary = atob(match[2]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      formData.append(
        field,
        new Blob([bytes], { type: mimeType }),
        field === 'mask' ? 'mask.png' : `reference-${index + 1}.png`
      );
      return;
    }
  } catch {
    // Fall back to raw value below; provider gateway can still resolve URLs.
  }

  formData.append(field, normalized);
}

class AsyncImageAPIService {
  private async submit(
    params: AsyncImageGenerationParams,
    signal?: AbortSignal,
    requestId?: string
  ): Promise<AsyncImageSubmitResponse> {
    const providerContext = resolveProviderContext(
      params.modelRef || params.model
    );

    const formData = new FormData();
    formData.append('model', params.model);
    formData.append('prompt', params.prompt);
    if (params.size) {
      formData.append('size', params.size);
    }
    if (params.referenceImages?.length) {
      for (const [index, referenceImage] of params.referenceImages.entries()) {
        await appendReferenceImage(
          formData,
          'input_reference',
          referenceImage,
          index
        );
      }
    }
    if (params.maskImage) {
      await appendReferenceImage(formData, 'mask', params.maskImage, 0);
    }

    if (isXingtuAccountProvider(providerContext)) {
      const isEditRequest = Boolean(params.referenceImages?.length || params.maskImage);
      if (isEditRequest) {
        formData.append('async', 'true');
      }
      const response = await xingtuBackendRequest<XingtuBackendImageJobSubmitResponse>(
        isEditRequest ? '/v1/images/edits' : '/v1/images/generations',
        {
          method: 'POST',
          body: isEditRequest
            ? formData
            : JSON.stringify({
                model: params.model,
                prompt: params.prompt,
                ...(params.size ? { size: params.size } : {}),
                async: true,
              }),
          signal,
        }
      );
      const normalized = normalizeXingtuJob(response.job);
      return {
        id: response.job_id,
        object: normalized.object,
        model: normalized.model,
        status: normalized.status,
        progress: normalized.progress ?? 0,
        created_at: normalized.created_at,
        error: normalized.error,
      };
    }

    if (providerContext.credentialSource !== 'oidc-session' && !providerContext.apiKey) {
      throw new Error('API Key 未配置');
    }

    const response = await providerTransport.send(providerContext, {
      path: '/videos',
      method: 'POST',
      requestId,
      body: formData,
      signal,
      timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = Object.assign(
        new Error(`图片任务提交失败: ${response.status} - ${errorText}`),
        {
          apiErrorBody: errorText,
          httpStatus: response.status,
        }
      );
      throw error;
    }

    return response.json();
  }

  private async query(
    id: string,
    routeModel?: string | ModelRef | null,
    signal?: AbortSignal
  ): Promise<AsyncImageQueryResponse> {
    const providerContext = resolveProviderContext(routeModel);

    if (isXingtuAccountProvider(providerContext)) {
      const job = await xingtuBackendRequest<XingtuBackendImageJob>(
        `/v1/images/generations/${id}`,
        {
          method: 'GET',
          signal,
        }
      );
      return normalizeXingtuJob(job);
    }

    if (providerContext.credentialSource !== 'oidc-session' && !providerContext.apiKey) {
      throw new Error('API Key 未配置');
    }

    const response = await providerTransport.send(providerContext, {
      path: `/videos/${id}`,
      method: 'GET',
      signal,
      timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = Object.assign(
        new Error(`图片任务查询失败: ${response.status} - ${errorText}`),
        {
          apiErrorBody: errorText,
          httpStatus: response.status,
        }
      );
      throw error;
    }

    return response.json();
  }

  async generateWithPolling(
    params: AsyncImageGenerationParams,
    options: PollingOptions = {}
  ): Promise<AsyncImageQueryResponse> {
    const {
      interval = 5000,
      maxAttempts,
      signal,
      requestId,
      onSubmissionAttempt,
      onProgress,
      onSubmitted,
    } = options;
    const maxPollingAttempts =
      maxAttempts ?? getDefaultImagePollingMaxAttempts(interval);

    await onSubmissionAttempt?.();
    const submitResp = await this.submit(params, signal, requestId);

    if (onSubmitted) {
      await onSubmitted(submitResp.id);
    }

    if (onProgress) {
      onProgress(submitResp.progress ?? 0, submitResp.status);
    }

    if (submitResp.status === 'failed') {
      const message =
        typeof submitResp.error === 'string'
          ? submitResp.error
          : submitResp.error?.message || '图片生成失败';
      throw new Error(message);
    }

    return this.pollUntilComplete(submitResp.id, {
      interval,
      maxAttempts: maxPollingAttempts,
      signal,
      onProgress,
      routeModel: params.modelRef || params.model,
    });
  }

  async generateXingtuBackendJobWithPolling(
    body: BodyInit,
    model: string,
    options: PollingOptions = {}
  ): Promise<AsyncImageQueryResponse> {
    const {
      interval = 5000,
      maxAttempts,
      signal,
      onProgress,
      onSubmitted,
      routeModel,
    } = options;
    const maxPollingAttempts =
      maxAttempts ?? getDefaultImagePollingMaxAttempts(interval);
    const isEditRequest = body instanceof FormData;
    if (isEditRequest && !body.has('async')) {
      body.append('async', 'true');
    }
    const response = await xingtuBackendRequest<XingtuBackendImageJobSubmitResponse>(
      isEditRequest ? '/v1/images/edits' : '/v1/images/generations',
      {
        method: 'POST',
        body: isEditRequest ? body : addAsyncFlagToJsonBody(String(body)),
        signal,
      }
    );
    const normalized = normalizeXingtuJob(response.job);
    if (onSubmitted) {
      onSubmitted(response.job_id);
    }
    if (onProgress) {
      onProgress(normalized.progress ?? 0, normalized.status);
    }
    if (normalized.status === 'failed') {
      const message =
        typeof normalized.error === 'string'
          ? normalized.error
          : normalized.error?.message || '图片生成失败';
      throw new Error(message);
    }
    return this.pollUntilComplete(response.job_id, {
      interval,
      maxAttempts: maxPollingAttempts,
      signal,
      onProgress,
      routeModel: routeModel || model,
    });
  }

  async resumePolling(
    id: string,
    options: PollingOptions = {}
  ): Promise<AsyncImageQueryResponse> {
    const { onProgress } = options;

    const immediate = await this.query(id, options.routeModel, options.signal);
    const immediateProgress =
      immediate.progress ??
      (immediate.status === 'failed'
        ? 100
        : immediate.status === 'completed'
        ? 100
        : 0);

    if (onProgress) {
      onProgress(immediateProgress, immediate.status);
    }

    if (immediate.status === 'completed') {
      return immediate;
    }

    if (immediate.status === 'failed') {
      const message =
        typeof immediate.error === 'string'
          ? immediate.error
          : immediate.error?.message || '图片生成失败';
      throw new Error(message);
    }

    return this.pollUntilComplete(id, options);
  }

  private async pollUntilComplete(
    id: string,
    options: PollingOptions = {}
  ): Promise<AsyncImageQueryResponse> {
    const {
      interval = 5000,
      maxAttempts,
      signal,
      onProgress,
      routeModel,
    } = options;
    const maxPollingAttempts =
      maxAttempts ?? getDefaultImagePollingMaxAttempts(interval);

    let attempts = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 10;

    while (attempts < maxPollingAttempts) {
      if (signal?.aborted) {
        throw new Error('Async image generation cancelled');
      }

      await this.sleep(interval, signal);
      attempts += 1;

      try {
        const status = await this.query(id, routeModel, signal);
        const progress =
          status.progress ??
          (status.status === 'failed'
            ? 100
            : status.status === 'completed'
            ? 100
            : 0);

        if (onProgress) {
          onProgress(progress, status.status);
        }

        if (status.status === 'completed') {
          return status;
        }

        if (status.status === 'failed') {
          const message =
            typeof status.error === 'string'
              ? status.error
              : status.error?.message || '图片生成失败';
          throw new AsyncImageTaskFailedError(message);
        }

        consecutiveErrors = 0; // reset on success
      } catch (error) {
        if (error instanceof AsyncImageTaskFailedError) {
          throw error;
        }
        consecutiveErrors += 1;
        if (consecutiveErrors >= maxConsecutiveErrors) {
          throw error;
        }
      }
    }

    throw new Error('图片生成超时');
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('Async image generation cancelled'));
        return;
      }

      let timeoutId: ReturnType<typeof setTimeout>;
      const onAbort = () => {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onAbort);
        reject(new Error('Async image generation cancelled'));
      };

      timeoutId = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, ms);

      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  /**
   * 辅助：从结果中提取最终图片 URL 和格式
   */
  extractUrlAndFormat(result: AsyncImageQueryResponse): {
    url: string;
    urls?: string[];
    format: string;
  } {
    const url = result.video_url || result.url;
    if (!url) {
      throw new Error('API 未返回有效的图片 URL');
    }
    const urls = result.urls?.length ? result.urls : undefined;
    const format = result.format || getFileExtension(url) || 'jpg';
    return { url, urls, format };
  }
}

export const asyncImageAPIService = new AsyncImageAPIService();
