import { request } from '../../lib/api/request';
import type { PlaygroundImageMode } from './playground.api';
import {
  imageAspectRatios,
  imageCountOptions,
  imageQualities,
  imageResolutionTiers,
  type ImageAspectRatio,
  type ImageCount,
  type ImageQuality,
  type ImageResolutionTier,
} from './playground-page.types';

export type PlaygroundHistoryStatus = 'succeeded' | 'failed';

export interface TextHistoryParameters {
  kind: 'text';
  useSystemPrompt: boolean;
  systemPrompt: string;
}

export interface ImageHistoryParameters {
  kind: 'image';
  size?: string;
  aspectRatio?: ImageAspectRatio;
  resolutionTier?: ImageResolutionTier;
  quality?: ImageQuality;
  count?: ImageCount;
  mode: PlaygroundImageMode;
  referenceFileNames: string[];
}

export interface TextHistoryResult {
  kind: 'text';
  content: string;
}

export interface ImageHistoryItem {
  url: string;
  revisedPrompt?: string;
  jobId?: string;
}

export interface ImageHistoryResult {
  kind: 'image';
  images: ImageHistoryItem[];
}

interface HistoryRecordBase {
  id: string;
  status: PlaygroundHistoryStatus;
  model: string;
  prompt: string;
  durationMs: number;
  error: string | null;
  createdAt: string;
}

export type PlaygroundHistoryRecord =
  | (HistoryRecordBase & {
      taskKind: 'text';
      parameters: TextHistoryParameters;
      result: TextHistoryResult | null;
    })
  | (HistoryRecordBase & {
      taskKind: 'image';
      parameters: ImageHistoryParameters;
      result: ImageHistoryResult | null;
    });

interface CreateHistoryBase {
  status: PlaygroundHistoryStatus;
  model: string;
  prompt: string;
  durationMs: number;
  error: string | null;
}

export type CreatePlaygroundHistoryInput =
  | (CreateHistoryBase & {
      taskKind: 'text';
      parameters: TextHistoryParameters;
      result: TextHistoryResult | null;
    })
  | (CreateHistoryBase & {
      taskKind: 'image';
      parameters: ImageHistoryParameters;
      result: ImageHistoryResult | null;
    });

export interface PlaygroundHistoryPage {
  records: PlaygroundHistoryRecord[];
  nextOffset: number;
  hasMore: boolean;
}

export async function createPlaygroundHistory(
  input: CreatePlaygroundHistoryInput
): Promise<PlaygroundHistoryRecord> {
  const response = await request<unknown>('/api/playground/history', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!isHistoryRecord(response)) {
    throw new Error('Playground 历史创建响应格式无效');
  }
  return response;
}

export async function getPlaygroundHistoryPage(input: {
  offset: number;
  limit: number;
}): Promise<PlaygroundHistoryPage> {
  const params = new URLSearchParams({
    offset: String(input.offset),
    limit: String(input.limit),
  });
  const response = await request<unknown>(`/api/playground/history?${params.toString()}`);
  if (!isHistoryPage(response)) {
    throw new Error('Playground 历史列表响应格式无效');
  }
  return response;
}

export function isPersistableImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    console.debug('Invalid Playground history image URL', error);
    return false;
  }
}

function isHistoryPage(value: unknown): value is PlaygroundHistoryPage {
  if (!isObject(value)) return false;
  return Array.isArray(value.records)
    && value.records.every(isHistoryRecord)
    && isNonNegativeInteger(value.nextOffset)
    && typeof value.hasMore === 'boolean';
}

function isHistoryRecord(value: unknown): value is PlaygroundHistoryRecord {
  if (!isObject(value)
    || typeof value.id !== 'string'
    || (value.status !== 'succeeded' && value.status !== 'failed')
    || typeof value.model !== 'string'
    || typeof value.prompt !== 'string'
    || !isNonNegativeInteger(value.durationMs)
    || (value.error !== null && typeof value.error !== 'string')
    || typeof value.createdAt !== 'string') {
    return false;
  }
  if (value.taskKind === 'text') {
    return isTextParameters(value.parameters)
      && (value.result === null || isTextResult(value.result));
  }
  if (value.taskKind === 'image') {
    return isImageParameters(value.parameters)
      && (value.result === null || isImageResult(value.result));
  }
  return false;
}

function isTextParameters(value: unknown): value is TextHistoryParameters {
  return isObject(value)
    && value.kind === 'text'
    && typeof value.useSystemPrompt === 'boolean'
    && typeof value.systemPrompt === 'string';
}

function isImageParameters(value: unknown): value is ImageHistoryParameters {
  return isObject(value)
    && value.kind === 'image'
    && (value.size === undefined || typeof value.size === 'string')
    && isOptionalStringValue(value.aspectRatio, imageAspectRatios)
    && isOptionalStringValue(value.resolutionTier, imageResolutionTiers)
    && isOptionalStringValue(value.quality, imageQualities)
    && isOptionalNumberValue(value.count, imageCountOptions)
    && (value.mode === 'sync' || value.mode === 'async')
    && Array.isArray(value.referenceFileNames)
    && value.referenceFileNames.every((item) => typeof item === 'string');
}

function isTextResult(value: unknown): value is TextHistoryResult {
  return isObject(value) && value.kind === 'text' && typeof value.content === 'string';
}

function isImageResult(value: unknown): value is ImageHistoryResult {
  return isObject(value)
    && value.kind === 'image'
    && Array.isArray(value.images)
    && value.images.every((item) => isObject(item)
      && typeof item.url === 'string'
      && (item.revisedPrompt === undefined || typeof item.revisedPrompt === 'string')
      && (item.jobId === undefined || typeof item.jobId === 'string'));
}

function isOptionalStringValue<T extends string>(
  value: unknown,
  options: readonly T[]
): value is T | undefined {
  return value === undefined || (typeof value === 'string' && options.includes(value as T));
}

function isOptionalNumberValue<T extends number>(
  value: unknown,
  options: readonly T[]
): value is T | undefined {
  return value === undefined || (typeof value === 'number' && options.includes(value as T));
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
