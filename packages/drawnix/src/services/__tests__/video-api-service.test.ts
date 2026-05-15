import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProviderModelBinding } from '../provider-routing/types';

const xingliuVideoBinding: ProviderModelBinding = {
  id: 'provider-a:seedance:video:openai.async.video',
  profileId: 'provider-a',
  modelId: 'doubao-seedance-2-0-fast-260128',
  operation: 'video',
  protocol: 'openai.async.video',
  requestSchema: 'openai.video.form-input-reference',
  responseSchema: 'openai.async.task',
  submitPath: '/v1/videos',
  pollPathTemplate: '/v1/videos/{taskId}',
  baseUrlStrategy: 'trim-v1',
  metadata: {
    video: {
      resolvedVideoApiCompatibility: 'xingliu-video',
      defaultDuration: '5',
      durationField: 'seconds',
      allowedDurations: ['5', '10'],
      strictDurationValidation: false,
    },
  },
  priority: 320,
  confidence: 'high',
  source: 'template',
};

const genericVideoBinding: ProviderModelBinding = {
  id: 'provider-a:veo3:video:openai.async.video',
  profileId: 'provider-a',
  modelId: 'veo3',
  operation: 'video',
  protocol: 'openai.async.video',
  requestSchema: 'openai.video.form-input-reference',
  responseSchema: 'openai.async.task',
  submitPath: '/videos',
  pollPathTemplate: '/videos/{taskId}',
  priority: 320,
  confidence: 'high',
  source: 'template',
};

function mockVideoPlan(binding: ProviderModelBinding, sendMock: ReturnType<typeof vi.fn>) {
  vi.doMock('../provider-routing', () => ({
    resolveInvocationPlanFromRoute: () => ({
      provider: {
        profileId: 'provider-a',
        profileName: 'Provider A',
        providerType: 'openai-compatible',
        baseUrl: 'https://video.example.com/v1',
        apiKey: 'video-secret',
        authType: 'bearer',
      },
      modelRef: {
        profileId: 'provider-a',
        modelId: binding.modelId,
      },
      binding,
    }),
    providerTransport: {
      send: sendMock,
    },
  }));

  vi.doMock('../../utils/settings-manager', async () => {
    const actual = await vi.importActual<object>('../../utils/settings-manager');
    return {
      ...actual,
      resolveInvocationRoute: () => ({
        profileId: 'provider-a',
        profileName: 'Provider A',
        providerType: 'openai-compatible',
        baseUrl: 'https://video.example.com/v1',
        apiKey: 'video-secret',
        authType: 'bearer',
      }),
    };
  });

  vi.doMock('../media-executor/llm-api-logger', () => ({
    startLLMApiLog: vi.fn(() => 'log-1'),
    updateLLMApiLogMetadata: vi.fn(),
    completeLLMApiLog: vi.fn(),
    failLLMApiLog: vi.fn(),
  }));
}

describe('video-api-service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('submits Xingliu text-to-video as JSON', async () => {
    const sendMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'video-task-1',
          status: 'unknown',
          model: 'doubao-seedance-2-0-fast-260128',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    mockVideoPlan(xingliuVideoBinding, sendMock);

    const { videoAPIService } = await import('../video-api-service');
    const result = await videoAPIService.submitVideoGeneration({
      model: 'doubao-seedance-2-0-fast-260128',
      prompt: 'white ball rolling on a table',
      size: '1280x720',
    });

    expect(result.id).toBe('video-task-1');
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0]?.[1]).toMatchObject({
      path: '/v1/videos',
      baseUrlStrategy: 'trim-v1',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(sendMock.mock.calls[0]?.[1].body).not.toBeInstanceOf(FormData);
    expect(JSON.parse(String(sendMock.mock.calls[0]?.[1].body))).toEqual({
      model: 'doubao-seedance-2-0-fast-260128',
      prompt: 'white ball rolling on a table',
      seconds: '5',
      metadata: {
        resolution: '480p',
        ratio: '16:9',
        generate_audio: false,
        watermark: false,
      },
    });
  });

  it('maps selected Xingliu video params into JSON metadata', async () => {
    const sendMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'video-task-1',
          status: 'unknown',
          model: 'doubao-seedance-2-0-fast-260128',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    mockVideoPlan(xingliuVideoBinding, sendMock);

    const { videoAPIService } = await import('../video-api-service');
    await videoAPIService.submitVideoGeneration({
      model: 'doubao-seedance-2-0-fast-260128',
      prompt: 'white ball rolling on a table',
      size: '480p',
      params: {
        aspect_ratio: '9:16',
        generate_audio: 'true',
        watermark: 'true',
      },
    });

    expect(JSON.parse(String(sendMock.mock.calls[0]?.[1].body))).toEqual({
      model: 'doubao-seedance-2-0-fast-260128',
      prompt: 'white ball rolling on a table',
      seconds: '5',
      metadata: {
        resolution: '480p',
        ratio: '9:16',
        generate_audio: true,
        watermark: true,
      },
    });
  });

  it('keeps non-Xingliu video submissions on multipart form data', async () => {
    const sendMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'video-task-1',
          status: 'queued',
          model: 'veo3',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    mockVideoPlan(genericVideoBinding, sendMock);

    const { videoAPIService } = await import('../video-api-service');
    await videoAPIService.submitVideoGeneration({
      model: 'veo3',
      prompt: 'make a video',
      seconds: '8',
      size: '1280x720',
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0]?.[1]).toMatchObject({
      path: '/videos',
      method: 'POST',
    });
    expect(sendMock.mock.calls[0]?.[1].headers).toBeUndefined();
    expect(sendMock.mock.calls[0]?.[1].body).toBeInstanceOf(FormData);

    const formData = sendMock.mock.calls[0]?.[1].body as FormData;
    expect(formData.get('model')).toBe('veo3');
    expect(formData.get('prompt')).toBe('make a video');
    expect(formData.get('seconds')).toBe('8');
    expect(formData.get('size')).toBe('1280x720');
  });
});
