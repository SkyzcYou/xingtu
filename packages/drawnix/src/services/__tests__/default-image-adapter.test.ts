import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateImage: vi.fn(),
}));

vi.mock('../../utils/gemini-api', () => ({
  defaultGeminiClient: {
    generateImage: mocks.generateImage,
  },
}));

vi.mock('../async-image-api-service', () => ({
  asyncImageAPIService: {
    generateWithPolling: vi.fn(),
    extractUrlAndFormat: vi.fn(),
  },
}));

vi.mock('../audio-api-service', () => ({
  audioAPIService: {},
  extractAudioGenerationResult: vi.fn(),
}));

vi.mock('../video-api-service', () => ({
  videoAPIService: {},
}));

vi.mock('../unified-cache-service', () => ({
  unifiedCacheService: {},
}));

import { geminiImageAdapter } from '../model-adapters/default-adapters';

describe('default image adapter compatibility', () => {
  afterEach(() => {
    mocks.generateImage.mockReset();
  });

  it('keeps generic GPT image fallback on the basic compatibility request shape', async () => {
    mocks.generateImage.mockResolvedValue({
      data: [
        {
          url: 'https://example.com/basic.png',
        },
      ],
    });

    const result = await geminiImageAdapter.generateImage(
      {
        baseUrl: 'https://gateway.example.com/v1',
        apiKey: 'test-key',
        authType: 'bearer',
      },
      {
        model: 'gpt-image-2',
        prompt: 'Draw a clean product photo',
        size: '1024x1024',
        referenceImages: ['data:image/png;base64,abc123'],
        params: {
          resolution: '4k',
          quality: 'high',
          n: 2,
        },
      }
    );

    expect(mocks.generateImage).toHaveBeenCalledWith(
      'Draw a clean product photo',
      {
        size: '1024x1024',
        image: ['data:image/png;base64,abc123'],
        response_format: 'url',
        quality: '4k',
        count: 2,
        model: 'gpt-image-2',
        modelRef: null,
      }
    );
    expect(result).toMatchObject({
      url: 'https://example.com/basic.png',
      format: 'png',
    });
  });

  it('defaults GPT Image 2 generic fallback quality to 1k when resolution is unset', async () => {
    mocks.generateImage.mockResolvedValue({
      data: [
        {
          url: 'https://example.com/basic.png',
        },
      ],
    });

    await geminiImageAdapter.generateImage(
      {
        baseUrl: 'https://gateway.example.com/v1',
        apiKey: 'test-key',
        authType: 'bearer',
      },
      {
        model: 'gpt-image-2',
        prompt: 'Draw a clean product photo',
        size: '16x9',
        params: {
          quality: 'high',
        },
      }
    );

    expect(mocks.generateImage).toHaveBeenCalledWith(
      'Draw a clean product photo',
      expect.objectContaining({
        quality: '1k',
      })
    );
  });
});
