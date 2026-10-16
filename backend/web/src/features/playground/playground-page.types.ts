import type {
  PlaygroundImageMode,
  PlaygroundMessage,
} from './playground.api';

export const imageAspectRatios = ['1:1', '3:2', '2:3', '16:9', '9:16'] as const;
export const imageResolutionTiers = ['1K', '2K', '4K'] as const;
export const imageQualities = ['auto', 'low', 'medium', 'high'] as const;
export const imageCountOptions = [1, 2, 3, 4] as const;

export const defaultImageAspectRatio: ImageAspectRatio = '1:1';
export const defaultImageResolutionTier: ImageResolutionTier = '1K';
export const defaultImageQuality: ImageQuality = 'auto';
export const defaultImageCount: ImageCount = 1;
export const maxImagePromptLength = 4000;
export const maxReferenceImageCount = 9;

export type ImageAspectRatio = (typeof imageAspectRatios)[number];
export type ImageResolutionTier = (typeof imageResolutionTiers)[number];
export type ImageQuality = (typeof imageQualities)[number];
export type ImageCount = (typeof imageCountOptions)[number];

export interface ChatMutationInput {
  model: string;
  messages: PlaygroundMessage[];
  prompt: string;
  useSystemPrompt: boolean;
  systemPrompt: string;
  startedAt: number;
}

export interface ImageMutationInput {
  model: string;
  prompt: string;
  aspectRatio: ImageAspectRatio;
  resolutionTier: ImageResolutionTier;
  quality: ImageQuality;
  count: ImageCount;
  referenceImages: File[];
  mode: PlaygroundImageMode;
  startedAt: number;
}

export function getImagePromptLength(value: string): number {
  return Array.from(value).length;
}

export function isImageAspectRatio(value: string): value is ImageAspectRatio {
  return imageAspectRatios.includes(value as ImageAspectRatio);
}

export function isImageResolutionTier(value: string): value is ImageResolutionTier {
  return imageResolutionTiers.includes(value as ImageResolutionTier);
}

export function isImageQuality(value: string): value is ImageQuality {
  return imageQualities.includes(value as ImageQuality);
}

export function isImageCount(value: number): value is ImageCount {
  return imageCountOptions.includes(value as ImageCount);
}

export function inferAspectRatioFromLegacySize(size: string | undefined): ImageAspectRatio {
  switch (size) {
    case '1024x1536':
      return '2:3';
    case '1536x1024':
      return '3:2';
    case '1792x1024':
      return '16:9';
    case '1024x1792':
      return '9:16';
    default:
      return defaultImageAspectRatio;
  }
}

export function getModelListHint(
  isLoading: boolean,
  error: Error | null,
  enabled: boolean
): string {
  if (isLoading) return '正在从上游获取模型列表。';
  if (error) return error.message;
  if (!enabled) return '中转未启用，当前显示 LLM 配置中已保存的模型。';
  return '模型列表来自后端 /v1/models 的上游查询结果。';
}
