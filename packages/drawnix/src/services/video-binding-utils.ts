import {
  getCompatibleParams,
  ALL_PARAMS,
  SORA_MODE_PARAM_ID,
  type ParamConfig,
} from '../constants/model-config';
import { getVideoModelConfig } from '../constants/video-model-config';
import type { VideoModelConfig } from '../types/video.types';
import type { ModelRef } from '../utils/settings-manager';
import { providerTransport } from './provider-routing/provider-transport';
import { resolveInvocationPlanFromRoute } from './provider-routing/settings-repository';
import type {
  ProviderModelBinding,
  ProviderVideoBindingMetadata,
  ResolvedProviderContext,
} from './provider-routing/types';

export {
  areSeedanceAudioDataUrlsWithinLimit,
  isPublicHttpMediaUrl,
  isSeedanceAudioReference,
} from '../utils/virtual-media-url';

const FIXED_SORA_DURATION_MODEL_PATTERN = /^sora-2-(\d+)s$/i;
const DEFAULT_VIDEO_POLL_PATH = '/videos/{taskId}';
const DEFAULT_VIDEO_DOWNLOAD_PATH = '/videos/{taskId}/content';
const SORA_API_ALLOWED_DURATIONS = ['4', '8', '12'] as const;
const SORA_MODE_VALUES = new Set(['api', 'web']);
const KLING_ACTION_VALUES = new Set(['text2video', 'image2video']);
const KLING_CAMERA_PARAM_IDS = new Set([
  'camera_control_type',
  'camera_horizontal',
  'camera_vertical',
  'camera_pan',
  'camera_tilt',
  'camera_roll',
  'camera_zoom',
]);
const XINGLIU_VIDEO_RESOLUTIONS = ['480p', '720p', '1080p'];
const XINGLIU_VIDEO_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];
const XINGLIU_VIDEO_RATIO_VALUES = new Set<string>(XINGLIU_VIDEO_RATIOS);

interface XingliuSeedanceCapability {
  resolutions: string[];
  defaultResolution: string;
  durations: string[];
  defaultDuration: string;
  showGenerateAudio: boolean;
  defaultGenerateAudio: string;
  showWatermark: boolean;
  defaultWatermark: string;
}

function normalizeStringParams(
  params?: Record<string, unknown> | null
): Record<string, string> {
  if (!params) {
    return {};
  }

  return Object.entries(params).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (value === undefined || value === null) {
        return acc;
      }

      const normalized = String(value).trim();
      if (normalized) {
        acc[key] = normalized;
      }
      return acc;
    },
    {}
  );
}

function normalizeDurationValue(
  value?: string | number | null
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : undefined;
}

function resolveSelectedKlingAction(
  params?: Record<string, unknown> | null
): 'text2video' | 'image2video' | null {
  const action = normalizeStringParams(params).klingAction2?.toLowerCase();
  if (action && KLING_ACTION_VALUES.has(action)) {
    return action as 'text2video' | 'image2video';
  }

  return null;
}

function buildDynamicEnumOptions(
  param: ParamConfig,
  allowedValues: string[]
): NonNullable<ParamConfig['options']> {
  const optionLabels = new Map(
    (param.options || []).map((option) => [option.value, option.label])
  );

  return allowedValues.map((value) => ({
    value,
    label: optionLabels.get(value) || value,
  }));
}

function resolveXingliuSeedanceCapability(
  modelId?: string | null
): XingliuSeedanceCapability {
  const normalized = modelId?.toLowerCase() || '';
  let resolutions = XINGLIU_VIDEO_RESOLUTIONS;

  if (
    normalized === 'seedance-nsfw' ||
    normalized.includes('720p') ||
    normalized.includes('fast') ||
    normalized.includes('1-5') ||
    normalized.includes('1.5')
  ) {
    resolutions = XINGLIU_VIDEO_RESOLUTIONS.slice(0, 2);
  }

  if (normalized === 'seedance-nsfw') {
    resolutions = XINGLIU_VIDEO_RESOLUTIONS.slice(0, 1);
  }

  if (normalized.includes('1080p')) {
    resolutions = XINGLIU_VIDEO_RESOLUTIONS;
  }

  return {
    resolutions,
    defaultResolution: resolutions[0],
    durations: ['5', '10'],
    defaultDuration: '5',
    showGenerateAudio: true,
    defaultGenerateAudio: 'false',
    showWatermark: true,
    defaultWatermark: 'false',
  };
}

function resolveXingliuResolution(
  value: string | undefined,
  capability: XingliuSeedanceCapability
): string | undefined {
  return value && capability.resolutions.includes(value) ? value : undefined;
}

function isSoraModel(modelId?: string | null): boolean {
  return Boolean(modelId && modelId.toLowerCase().includes('sora'));
}

function supportsSoraFrontendMode(modelId?: string | null): boolean {
  if (!modelId) {
    return false;
  }

  const normalized = modelId.toLowerCase();
  return normalized === 'sora-2' || normalized === 'sora-2-pro';
}

function inferDefaultSoraMode(
  binding?: ProviderModelBinding | null
): 'api' | 'web' {
  const allowedDurations = binding?.metadata?.video?.allowedDurations || [];
  if (
    allowedDurations.length === SORA_API_ALLOWED_DURATIONS.length &&
    allowedDurations.every(
      (value, index) => value === SORA_API_ALLOWED_DURATIONS[index]
    )
  ) {
    return 'api';
  }
  return 'web';
}

function resolveSoraMode(
  modelId?: string | null,
  binding?: ProviderModelBinding | null,
  params?: Record<string, unknown> | null
): 'api' | 'web' | null {
  if (!supportsSoraFrontendMode(modelId)) {
    return null;
  }

  const selectedMode =
    normalizeStringParams(params)[SORA_MODE_PARAM_ID]?.toLowerCase();
  if (selectedMode && SORA_MODE_VALUES.has(selectedMode)) {
    return selectedMode as 'api' | 'web';
  }

  return inferDefaultSoraMode(binding);
}

function getExplicitSoraMode(
  params?: Record<string, unknown> | null
): 'api' | 'web' | null {
  const selectedMode =
    normalizeStringParams(params)[SORA_MODE_PARAM_ID]?.toLowerCase();
  if (selectedMode && SORA_MODE_VALUES.has(selectedMode)) {
    return selectedMode as 'api' | 'web';
  }

  return null;
}

function getSoraWebAllowedDurations(
  modelId: string | null | undefined,
  baseDurations: string[]
): string[] {
  const normalized = modelId?.toLowerCase();
  if (normalized === 'sora-2') {
    return ['10', '15'];
  }
  if (normalized === 'sora-2-pro') {
    return ['10', '15', '25'];
  }
  return baseDurations;
}

function buildStaticSoraMetadata(
  modelId?: string | null
): ProviderVideoBindingMetadata | null {
  if (!isSoraModel(modelId)) {
    return null;
  }

  const config = getVideoModelConfig(modelId || 'sora-2');
  const fixedDurationMatch = (modelId || '').match(FIXED_SORA_DURATION_MODEL_PATTERN);
  const baseDurations = config.durationOptions.map((option) => option.value);
  const allowedDurations = fixedDurationMatch?.[1]
    ? [fixedDurationMatch[1]]
    : getSoraWebAllowedDurations(modelId, baseDurations);

  return {
    allowedDurations,
    defaultDuration:
      config.defaultDuration || fixedDurationMatch?.[1] || allowedDurations[0],
    durationMode: fixedDurationMatch ? 'model-alias' : 'request-param',
    durationField: 'seconds',
    durationToModelMap: fixedDurationMatch?.[1]
      ? {
          [fixedDurationMatch[1]]: modelId || 'sora-2',
        }
      : undefined,
    strictDurationValidation: Boolean(fixedDurationMatch?.[1]),
    resultMode: 'inline-url',
  };
}

function buildFrontendSoraMetadata(
  modelId?: string | null,
  binding?: ProviderModelBinding | null,
  params?: Record<string, unknown> | null
): ProviderVideoBindingMetadata | null {
  const soraMode = getExplicitSoraMode(params);
  if (!soraMode) {
    return null;
  }

  if (soraMode === 'api') {
    return {
      allowedDurations: [...SORA_API_ALLOWED_DURATIONS],
      defaultDuration: '8',
      durationMode: 'request-param',
      durationField: 'seconds',
      strictDurationValidation: false,
    };
  }

  const staticMetadata = buildStaticSoraMetadata(modelId);
  if (!staticMetadata) {
    return null;
  }

  return {
    allowedDurations: staticMetadata.allowedDurations,
    defaultDuration: staticMetadata.defaultDuration,
    durationMode: staticMetadata.durationMode,
    durationField: staticMetadata.durationField,
    durationToModelMap: staticMetadata.durationToModelMap,
    strictDurationValidation: false,
  };
}

function mergeVideoMetadata(
  baseMetadata?: ProviderVideoBindingMetadata | null,
  overrideMetadata?: ProviderVideoBindingMetadata | null
): ProviderVideoBindingMetadata | null {
  if (!baseMetadata && !overrideMetadata) {
    return null;
  }

  return {
    ...(baseMetadata || {}),
    ...(overrideMetadata || {}),
    allowedDurations:
      overrideMetadata?.allowedDurations || baseMetadata?.allowedDurations,
    durationToModelMap:
      overrideMetadata?.durationToModelMap || baseMetadata?.durationToModelMap,
    strictDurationValidation:
      overrideMetadata?.strictDurationValidation ??
      baseMetadata?.strictDurationValidation,
  };
}

function buildDurationOptions(
  baseConfig: VideoModelConfig,
  allowedDurations: string[]
) {
  const baseLabels = new Map(
    baseConfig.durationOptions.map((option) => [option.value, option.label])
  );

  return allowedDurations.map((value) => ({
    value,
    label:
      baseLabels.get(value) ||
      `${value}秒${allowedDurations.length === 1 ? '（固定）' : ''}`,
  }));
}

function getVideoExtensionFromMimeType(mimeType?: string): string {
  const normalized = mimeType?.toLowerCase() || '';
  if (normalized.includes('quicktime')) return 'mov';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('ogg')) return 'ogv';
  return 'mp4';
}

export interface ResolvedVideoSubmission {
  model: string;
  duration?: string;
  durationField: string;
  bindingMetadata: ProviderVideoBindingMetadata | null;
}

export interface XingliuVideoMetadata {
  resolution: string;
  ratio: string;
  generate_audio: boolean;
  watermark: boolean;
}

function getFirstStringParam(
  params: Record<string, unknown> | null | undefined,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = params?.[key];
    if (value === undefined || value === null) {
      continue;
    }

    const normalized = String(value).trim();
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function getBooleanParam(
  params: Record<string, unknown> | null | undefined,
  keys: string[]
): boolean | undefined {
  for (const key of keys) {
    const value = params?.[key];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no', 'off'].includes(normalized)) {
        return false;
      }
    }
  }

  return undefined;
}

function getAspectRatio(width: number, height: number): string | undefined {
  if (!width || !height) {
    return undefined;
  }

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function normalizeXingliuRatio(value?: string): string | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const match = normalized.match(/^(\d+)\s*[:x]\s*(\d+)$/);
  const ratio = match
    ? getAspectRatio(Number(match[1]), Number(match[2]))
    : normalized;

  return ratio && XINGLIU_VIDEO_RATIO_VALUES.has(ratio) ? ratio : undefined;
}

function parseXingliuSize(size?: string | null): Partial<XingliuVideoMetadata> {
  const normalized = size?.trim().toLowerCase();
  if (!normalized) {
    return {};
  }

  const resolutionRatioMatch = normalized.match(
    /^(\d{3,4}p)(?:\s*@\s*(\d+\s*[:x]\s*\d+))?$/
  );
  if (resolutionRatioMatch) {
    return {
      resolution: resolutionRatioMatch[1],
      ratio: normalizeXingliuRatio(resolutionRatioMatch[2]),
    };
  }

  const pixelMatch = normalized.match(/^(\d+)\s*x\s*(\d+)$/);
  if (pixelMatch) {
    return {
      ratio: normalizeXingliuRatio(
        getAspectRatio(Number(pixelMatch[1]), Number(pixelMatch[2]))
      ),
    };
  }

  return {
    ratio: normalizeXingliuRatio(normalized),
  };
}

export function isXingliuVideoBinding(
  binding?: ProviderModelBinding | null,
  metadata?: ProviderVideoBindingMetadata | null
): boolean {
  const videoMetadata = metadata ?? binding?.metadata?.video ?? null;
  return videoMetadata?.resolvedVideoApiCompatibility === 'xingliu-video';
}

export function buildXingliuVideoMetadata(
  size?: string | null,
  params?: Record<string, unknown> | null,
  modelId?: string | null
): XingliuVideoMetadata {
  const parsedSize = parseXingliuSize(size);
  const capability = resolveXingliuSeedanceCapability(modelId);
  const resolution = getFirstStringParam(params, [
    'resolution',
    'xingliu_resolution',
    'xingliuResolution',
  ]);
  const ratio = getFirstStringParam(params, [
    'ratio',
    'aspect_ratio',
    'aspectRatio',
  ]);

  return {
    resolution:
      resolveXingliuResolution(resolution, capability) ||
      resolveXingliuResolution(parsedSize.resolution, capability) ||
      capability.defaultResolution,
    ratio: normalizeXingliuRatio(ratio) || parsedSize.ratio || '16:9',
    generate_audio:
      getBooleanParam(params, ['generate_audio', 'generateAudio']) ?? false,
    watermark: getBooleanParam(params, ['watermark']) ?? false,
  };
}

export function getResolvedVideoBindingMetadata(
  modelId?: string | null,
  binding?: ProviderModelBinding | null,
  params?: Record<string, unknown> | null
): ProviderVideoBindingMetadata | null {
  const staticMetadata = buildStaticSoraMetadata(modelId);
  const bindingMetadata = binding?.metadata?.video || null;
  const frontendMetadata = buildFrontendSoraMetadata(modelId, binding, params);
  return mergeVideoMetadata(
    mergeVideoMetadata(staticMetadata, bindingMetadata),
    frontendMetadata
  );
}

export function getEffectiveVideoModelConfig(
  modelId: string,
  binding?: ProviderModelBinding | null,
  params?: Record<string, unknown> | null
): VideoModelConfig {
  const baseConfig = getVideoModelConfig(modelId);
  const metadata = getResolvedVideoBindingMetadata(modelId, binding, params);

  if (!metadata?.allowedDurations?.length) {
    return baseConfig;
  }

  const allowedDurations = metadata.allowedDurations;
  const durationOptions = buildDurationOptions(baseConfig, allowedDurations);
  const defaultDuration = allowedDurations.includes(
    metadata.defaultDuration || ''
  )
    ? (metadata.defaultDuration as string)
    : allowedDurations.includes(baseConfig.defaultDuration)
    ? baseConfig.defaultDuration
    : allowedDurations[0];

  return {
    ...baseConfig,
    durationOptions,
    defaultDuration,
  };
}

export function getEffectiveVideoModelConfigForSelection(
  modelId: string,
  modelRef?: ModelRef | string | null,
  params?: Record<string, unknown> | null
): VideoModelConfig {
  const plan = resolveInvocationPlanFromRoute('video', modelRef || modelId);
  return getEffectiveVideoModelConfig(modelId, plan?.binding || null, params);
}

export function getEffectiveVideoDefaultParams(
  modelId: string,
  modelRef?: ModelRef | string | null,
  params?: Record<string, unknown> | null
): {
  duration: string;
  size: string;
} {
  const config = getEffectiveVideoModelConfigForSelection(
    modelId,
    modelRef,
    params
  );
  return {
    duration: config.defaultDuration,
    size: config.defaultSize,
  };
}

export function getEffectiveVideoCompatibleParams(
  modelId: string,
  modelRef?: ModelRef | string | null,
  params?: Record<string, unknown> | null
): ParamConfig[] {
  let compatibleParams = getCompatibleParams(modelId);
  const plan = resolveInvocationPlanFromRoute('video', modelRef || modelId);
  const metadata = getResolvedVideoBindingMetadata(
    modelId,
    plan?.binding || null,
    params
  );
  const selectedKlingAction = resolveSelectedKlingAction(params);
  const isXingliuVideo = isXingliuVideoBinding(plan?.binding || null, metadata);
  if (isXingliuVideo && /seedance/i.test(modelId)) {
    compatibleParams = ALL_PARAMS.filter((param) => param.compatibleTags?.includes('seedance'));
  }
  const xingliuSeedanceCapability = resolveXingliuSeedanceCapability(modelId);
  const effectiveConfig = getEffectiveVideoModelConfigForSelection(
    modelId,
    modelRef,
    params
  );

  return compatibleParams
    .filter((param) => {
      if (
        plan?.binding?.protocol === 'kling.video' &&
        selectedKlingAction === 'image2video' &&
        KLING_CAMERA_PARAM_IDS.has(param.id)
      ) {
        return false;
      }

      if (param.compatibleTags?.includes('seedance')) {
        if (param.id === 'generate_audio') {
          return isXingliuVideo && xingliuSeedanceCapability.showGenerateAudio;
        }
        if (param.id === 'watermark') {
          return isXingliuVideo && xingliuSeedanceCapability.showWatermark;
        }
      }

      return true;
    })
    .map((param) => {
      if (
        plan?.binding?.protocol === 'kling.video' &&
        metadata?.versionField === param.id &&
        param.valueType === 'enum'
      ) {
        const actionScopedOptions =
          (selectedKlingAction &&
            metadata.versionOptionsByAction?.[selectedKlingAction]) ||
          metadata.versionOptions ||
          [];
        const options =
          actionScopedOptions.length > 0
            ? buildDynamicEnumOptions(param, actionScopedOptions)
            : param.options;
        const defaultValue =
          actionScopedOptions.length > 0
            ? actionScopedOptions.includes(metadata.defaultVersion || '')
              ? metadata.defaultVersion
              : actionScopedOptions.includes(param.defaultValue || '')
                ? param.defaultValue
                : actionScopedOptions[0]
            : param.defaultValue;

        return {
          ...param,
          options,
          defaultValue,
        };
      }

      if (param.id === 'size') {
        if (isXingliuVideo && param.compatibleTags?.includes('seedance')) {
          return {
            ...param,
            options: buildDynamicEnumOptions(
              param,
              xingliuSeedanceCapability.resolutions
            ),
            defaultValue: xingliuSeedanceCapability.defaultResolution,
          };
        }

        return {
          ...param,
          options: effectiveConfig.sizeOptions.map((option) => ({
            value: option.value,
            label: option.label,
          })),
          defaultValue: effectiveConfig.defaultSize,
        };
      }

      if (
        param.id === 'aspect_ratio' &&
        isXingliuVideo &&
        param.compatibleTags?.includes('seedance')
      ) {
        return {
          ...param,
          options: buildDynamicEnumOptions(param, XINGLIU_VIDEO_RATIOS),
          defaultValue: XINGLIU_VIDEO_RATIOS.includes(param.defaultValue || '')
            ? param.defaultValue
            : '16:9',
        };
      }

      if (param.id === 'duration') {
        if (isXingliuVideo && param.compatibleTags?.includes('seedance')) {
          return {
            ...param,
            options: buildDynamicEnumOptions(
              param,
              xingliuSeedanceCapability.durations
            ),
            defaultValue: xingliuSeedanceCapability.defaultDuration,
          };
        }

        return {
          ...param,
          options: effectiveConfig.durationOptions.map((option) => ({
            value: option.value,
            label: option.label,
          })),
          defaultValue: effectiveConfig.defaultDuration,
        };
      }

      if (
        param.id === 'generate_audio' &&
        isXingliuVideo &&
        param.compatibleTags?.includes('seedance')
      ) {
        return {
          ...param,
          defaultValue: xingliuSeedanceCapability.defaultGenerateAudio,
        };
      }

      if (
        param.id === 'watermark' &&
        isXingliuVideo &&
        param.compatibleTags?.includes('seedance')
      ) {
        return {
          ...param,
          defaultValue: xingliuSeedanceCapability.defaultWatermark,
        };
      }

      return param;
    });
}

export function getDefaultVideoExtraParams(
  modelId: string,
  modelRef?: ModelRef | string | null,
  params?: Record<string, unknown> | null
): Record<string, string> {
  const compatibleParams = getEffectiveVideoCompatibleParams(
    modelId,
    modelRef,
    params
  );
  const normalizedParams = normalizeStringParams(params);

  return compatibleParams.reduce<Record<string, string>>((acc, param) => {
    if (param.id === 'duration' || param.id === 'size') {
      return acc;
    }

    const nextValue = normalizedParams[param.id] || param.defaultValue;
    if (nextValue) {
      acc[param.id] = nextValue;
    }
    return acc;
  }, {});
}

export function resolveVideoSubmission(
  modelId: string,
  requestedDuration?: string | number | null,
  binding?: ProviderModelBinding | null,
  params?: Record<string, unknown> | null
): ResolvedVideoSubmission {
  const metadata = getResolvedVideoBindingMetadata(modelId, binding, params);
  const durationField = metadata?.durationField || 'seconds';
  const duration =
    normalizeDurationValue(requestedDuration) || metadata?.defaultDuration;

  if (
    duration &&
    metadata?.allowedDurations?.length &&
    metadata.strictDurationValidation !== false &&
    !metadata.allowedDurations.includes(duration)
  ) {
    throw new Error(
      `视频时长 ${duration}s 不受支持，可选时长：${metadata.allowedDurations.join(
        '/'
      )} 秒`
    );
  }

  if (metadata?.durationMode === 'model-alias' && duration) {
    return {
      model: metadata.durationToModelMap?.[duration] || modelId,
      duration: undefined,
      durationField,
      bindingMetadata: metadata,
    };
  }

  return {
    model: modelId,
    duration,
    durationField,
    bindingMetadata: metadata,
  };
}

function getNonEmptyUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export function extractInlineVideoUrl(
  payload: Record<string, any> | null | undefined
): string | undefined {
  return (
    getNonEmptyUrl(payload?.video_url) ||
    getNonEmptyUrl(payload?.url) ||
    getNonEmptyUrl(payload?.output?.url) ||
    getNonEmptyUrl(payload?.metadata?.url)
  );
}

export function isXingliuVideoResultReady(
  payload: Record<string, any> | null | undefined,
  binding?: ProviderModelBinding | null
): boolean {
  return isXingliuVideoBinding(binding) && Boolean(extractInlineVideoUrl(payload));
}

function resolveTemplatePath(
  template: string,
  taskId: string,
  params?: Record<string, unknown> | null
): string {
  return template.replace(/\{([^}]+)\}/g, (placeholder, key) => {
    const value = key === 'taskId' || key === 'id' ? taskId : params?.[key];
    if (value === undefined || value === null || value === '') {
      return placeholder;
    }

    return encodeURIComponent(String(value));
  });
}

export function resolveVideoPollPath(
  videoId: string,
  binding?: ProviderModelBinding | null,
  params?: Record<string, unknown> | null
): string {
  const template = binding?.pollPathTemplate || DEFAULT_VIDEO_POLL_PATH;
  return resolveTemplatePath(template, videoId, params);
}

export function shouldDownloadVideoContent(
  modelId?: string | null,
  binding?: ProviderModelBinding | null,
  payload?: Record<string, any> | null
): boolean {
  const metadata = getResolvedVideoBindingMetadata(modelId, binding);
  const inlineUrl = extractInlineVideoUrl(payload);
  if (metadata?.resultMode === 'download-content') {
    return true;
  }

  if (!inlineUrl && Boolean(metadata?.downloadPathTemplate)) {
    return true;
  }

  const status = String(payload?.status || payload?.state || '').toLowerCase();
  return (
    !inlineUrl &&
    isSoraModel(modelId) &&
    (status === 'completed' || status === 'succeeded')
  );
}

export function resolveVideoDownloadPath(
  videoId: string,
  modelId?: string | null,
  binding?: ProviderModelBinding | null
): string {
  const metadata = getResolvedVideoBindingMetadata(modelId, binding);
  const template =
    metadata?.downloadPathTemplate || DEFAULT_VIDEO_DOWNLOAD_PATH;
  return resolveTemplatePath(template, videoId);
}

export async function downloadVideoContentToLocalUrl(params: {
  videoId: string;
  provider: ResolvedProviderContext;
  binding?: ProviderModelBinding | null;
  modelId?: string | null;
  cacheKey?: string;
  resultVisibility?: 'user' | 'internal';
  signal?: AbortSignal;
  fallbackToObjectUrl?: boolean;
}): Promise<string> {
  const response = await providerTransport.send(params.provider, {
    path: resolveVideoDownloadPath(
      params.videoId,
      params.modelId,
      params.binding
    ),
    baseUrlStrategy: params.binding?.baseUrlStrategy,
    method: 'GET',
    headers: {
      Accept: 'video/*,application/octet-stream',
    },
    signal: params.signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `视频内容下载失败: ${response.status}${
        errorText ? ` - ${errorText}` : ''
      }`
    );
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error('视频内容下载为空');
  }

  const format = getVideoExtensionFromMimeType(blob.type);
  const cacheKey = params.cacheKey || params.videoId;
  const localUrl = `/__aitu_cache__/video/${cacheKey}.${format}`;

  try {
    const { unifiedCacheService } = await import('./unified-cache-service');
    await unifiedCacheService.cacheMediaFromBlob(localUrl, blob, 'video', {
      taskId: cacheKey,
      model: params.modelId || undefined,
      ...(params.resultVisibility
        ? { resultVisibility: params.resultVisibility }
        : {}),
    });
    return localUrl;
  } catch (error) {
    if (params.fallbackToObjectUrl === false) {
      throw error;
    }
    return URL.createObjectURL(blob);
  }
}
