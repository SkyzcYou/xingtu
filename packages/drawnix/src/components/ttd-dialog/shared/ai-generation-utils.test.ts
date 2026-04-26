import { describe, expect, it, vi } from 'vitest';
import { normalizeOptimizedPromptResult } from './ai-generation-utils';

vi.mock('../../../utils/gemini-api', () => ({
  promptForApiKey: vi.fn(),
}));

vi.mock('../../../utils/api-auth-error-event', () => ({
  classifyApiCredentialError: (message: string) =>
    message.includes('invalid') ? 'invalid' : 'unknown',
}));

describe('normalizeOptimizedPromptResult', () => {
  it('unwraps fenced code blocks through the compatibility export', () => {
    expect(
      normalizeOptimizedPromptResult('```text\n优化后的提示词\n```')
    ).toBe('优化后的提示词');
  });

  it('returns trimmed plain text through the compatibility export', () => {
    expect(normalizeOptimizedPromptResult('  refined prompt  ')).toBe(
      'refined prompt'
    );
  });
});
