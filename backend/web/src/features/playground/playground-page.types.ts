import type {
  PlaygroundImageMode,
  PlaygroundMessage,
} from './playground.api';

export const imageSizes = ['1024x1024', '1024x1536', '1536x1024'] as const;

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
  size: (typeof imageSizes)[number];
  referenceImages: File[];
  mode: PlaygroundImageMode;
  startedAt: number;
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
