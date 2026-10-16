import {
  isPersistableImageUrl,
  type CreatePlaygroundHistoryInput,
} from './playground-history.api';
import type { ChatMutationInput, ImageMutationInput } from './playground-page.types';
import type { PlaygroundImageResult } from './playground.api';

export function buildTextHistoryRecord(
  input: ChatMutationInput,
  outcome: { content: string } | { error: string }
): CreatePlaygroundHistoryInput {
  const succeeded = 'content' in outcome;
  return {
    taskKind: 'text',
    status: succeeded ? 'succeeded' : 'failed',
    model: input.model,
    prompt: input.prompt,
    durationMs: Date.now() - input.startedAt,
    parameters: {
      kind: 'text',
      useSystemPrompt: input.useSystemPrompt,
      systemPrompt: input.systemPrompt,
    },
    result: succeeded ? { kind: 'text', content: outcome.content } : null,
    error: succeeded ? null : outcome.error,
  };
}

export function buildImageHistoryRecord(
  input: ImageMutationInput,
  outcome: { results: PlaygroundImageResult[] } | { error: string }
): CreatePlaygroundHistoryInput {
  const succeeded = 'results' in outcome;
  const images = succeeded
    ? outcome.results
      .filter((item) => isPersistableImageUrl(item.src))
      .map((item) => ({
        url: item.src,
        revisedPrompt: item.revisedPrompt,
        jobId: item.jobId,
      }))
    : [];
  return {
    taskKind: 'image',
    status: succeeded ? 'succeeded' : 'failed',
    model: input.model,
    prompt: input.prompt,
    durationMs: Date.now() - input.startedAt,
    parameters: {
      kind: 'image',
      aspectRatio: input.aspectRatio,
      resolutionTier: input.resolutionTier,
      quality: input.quality,
      count: input.count,
      mode: input.mode,
      referenceFileNames: input.referenceImages.map((file) => file.name),
    },
    result: succeeded ? { kind: 'image', images } : null,
    error: succeeded ? null : outcome.error,
  };
}
