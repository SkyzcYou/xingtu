import { describe, expect, it, vi } from 'vitest';
import {
  generateImageAsync,
  generateImageSync,
  resumeAsyncImagePolling,
  queryVideoStatus,
  submitVideoGeneration,
} from '../media-api';
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

describe('media-api provider routing', () => {
  it('uses header auth and extra headers for sync image generation', async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe(
          'https://api.example.com/v1/images/generations'
        );
        const headers = init?.headers as Record<string, string>;
        expect(headers['Content-Type']).toBe('application/json');
        expect(headers['X-API-Key']).toBe('secret');
        expect(headers['X-Trace-Id']).toBe('trace-1');

        return new Response(
          JSON.stringify({
            data: [{ url: 'https://cdn.example.com/image.png' }],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    );

    const result = await generateImageSync(
      {
        prompt: 'test prompt',
        model: 'gemini-3-pro-image-preview',
      },
      {
        apiKey: 'secret',
        baseUrl: 'https://api.example.com/v1',
        authType: 'header',
        extraHeaders: {
          'X-Trace-Id': 'trace-1',
        },
        fetchImpl,
      },
      undefined,
      'task-sync-image-1'
    );

    expect(result.url).toBe('https://cdn.example.com/image.png');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('uses query auth for async image polling endpoints', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(
        'https://gateway.example.com/v1/videos/task-1?key=secret'
      );

      return new Response(
        JSON.stringify({
          id: 'task-1',
          status: 'completed',
          url: 'https://cdn.example.com/final.png',
          progress: 100,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    const result = await resumeAsyncImagePolling('task-1', {
      apiKey: 'secret',
      baseUrl: 'https://gateway.example.com/v1',
      providerType: 'gemini-compatible',
      authType: 'query',
      fetchImpl,
    });

    expect(result.url).toBe('https://cdn.example.com/final.png');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('submits async image reference images and mask to /v1/videos form data', async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === 'data:image/png;base64,abc123') {
          return new Response(new Blob(['ref'], { type: 'image/png' }), {
            status: 200,
          });
        }
        if (String(input) === 'data:image/png;base64,mask123') {
          return new Response(new Blob(['mask'], { type: 'image/png' }), {
            status: 200,
          });
        }

        if (String(input) === 'https://gateway.example.com/v1/videos') {
          expect(init?.body).toBeInstanceOf(FormData);
          const formData = init?.body as FormData;
          expect(formData.get('model')).toBe('gpt-image-2');
          expect(formData.get('prompt')).toBe('edit with reference');
          expect(formData.get('size')).toBe('1:1');
          expect(formData.get('input_reference')).toBeInstanceOf(Blob);
          expect(formData.get('mask')).toBeInstanceOf(Blob);

          return new Response(
            JSON.stringify({
              id: 'task-1',
              status: 'completed',
              progress: 100,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        expect(String(input)).toBe(
          'https://gateway.example.com/v1/videos/task-1'
        );
        return new Response(
          JSON.stringify({
            id: 'task-1',
            status: 'completed',
            url: 'https://cdn.example.com/final.png',
            progress: 100,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    );

    let resolveSubmissionAttempt!: () => void;
    const submissionAttempt = new Promise<void>((resolve) => {
      resolveSubmissionAttempt = resolve;
    });
    const onSubmissionAttempt = vi.fn(async () => submissionAttempt);
    const generationPromise = generateImageAsync(
      {
        prompt: 'edit with reference',
        model: 'gpt-image-2',
        size: '1:1',
        referenceImages: ['data:image/png;base64,abc123'],
        maskImage: 'data:image/png;base64,mask123',
      },
      {
        apiKey: 'secret',
        baseUrl: 'https://gateway.example.com/v1',
        authType: 'bearer',
        fetchImpl,
      },
      {
        interval: 1,
        maxAttempts: 1,
        requestId: 'task-async-image-1',
        onSubmissionAttempt,
      }
    );

    await vi.waitFor(() => expect(onSubmissionAttempt).toHaveBeenCalled());
    expect(
      fetchImpl.mock.calls.some(
        ([input]) => String(input) === 'https://gateway.example.com/v1/videos'
      )
    ).toBe(false);
    resolveSubmissionAttempt();
    const result = await generationPromise;

    expect(result.url).toBe('https://cdn.example.com/final.png');
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    const pollCall = fetchImpl.mock.calls.find(([input]) =>
      String(input).endsWith('/videos/task-1')
    );
    expect(
      (pollCall?.[1]?.headers as Record<string, string>)?.['X-Request-Id']
    ).toBeUndefined();
  });

  it('uses bearer auth for shared video submission', async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe('https://video.example.com/v1/videos');
        const headers = init?.headers as Record<string, string>;
        expect(headers.Authorization).toBe('Bearer video-secret');
        expect(init?.method).toBe('POST');
        expect(init?.body).toBeInstanceOf(FormData);

        return new Response(
          JSON.stringify({
            id: 'video-task-1',
            status: 'queued',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    );

    const remoteId = await submitVideoGeneration(
      {
        prompt: 'make a video',
        model: 'veo3',
      },
      {
        apiKey: 'video-secret',
        baseUrl: 'https://video.example.com/v1',
        authType: 'bearer',
        fetchImpl,
      }
    );

    expect(remoteId).toBe('video-task-1');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('submits MiniMax-H3 through its official v2 JSON endpoint', async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe(
          'https://video.example.com/v2/video_generation'
        );
        expect(init?.headers).toMatchObject({
          Authorization: 'Bearer video-secret',
          'Content-Type': 'application/json',
        });
        expect(JSON.parse(String(init?.body))).toEqual({
          model: 'MiniMax-H3',
          content: [{ type: 'text', text: 'make a video' }],
          duration: 5,
          resolution: '2K',
          ratio: '16:9',
        });

        return new Response(JSON.stringify({ task_id: 'minimax-task-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    );

    const remoteId = await submitVideoGeneration(
      {
        prompt: 'make a video',
        model: 'MiniMax-H3',
        duration: '5',
        size: '2k',
        params: { ratio: '16:9', api_version: 'v2' },
      },
      {
        apiKey: 'video-secret',
        baseUrl: 'https://video.example.com/v1',
        authType: 'bearer',
        fetchImpl,
      }
    );

    expect(remoteId).toBe('minimax-task-1');
  });

  it('submits MiniMax-H3 through the default v1 JSON endpoint', async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe('https://video.example.com/v1/videos');
        expect(init?.headers).toMatchObject({
          Authorization: 'Bearer video-secret',
          'Content-Type': 'application/json',
        });
        expect(JSON.parse(String(init?.body))).toEqual({
          model: 'MiniMax-H3',
          content: [{ type: 'text', text: 'make a v1 video' }],
          duration: 5,
          resolution: '2K',
          ratio: '16:9',
        });

        return new Response(
          JSON.stringify({
            id: 'minimax-v1-task-1',
            model: 'MiniMax-H3',
            status: 'queued',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    );

    const remoteId = await submitVideoGeneration(
      {
        prompt: 'make a v1 video',
        model: 'MiniMax-H3',
        duration: '5',
        size: '2K',
        params: { ratio: '16:9' },
      },
      {
        apiKey: 'video-secret',
        baseUrl: 'https://video.example.com/v1',
        authType: 'bearer',
        fetchImpl,
      }
    );

    expect(remoteId).toBe('minimax-v1-task-1');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('polls MiniMax-H3 through its official v2 endpoint', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(
        'https://video.example.com/v2/query/video_generation/minimax-task-1'
      );

      return new Response(
        JSON.stringify({
          task: {
            id: 'minimax-task-1',
            model: 'MiniMax-H3',
            status: 'running',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    const status = await queryVideoStatus('minimax-task-1', {
      apiKey: 'video-secret',
      baseUrl: 'https://video.example.com/v1',
      defaultModel: 'MiniMax-H3',
      params: { api_version: 'v2' },
      authType: 'bearer',
      fetchImpl,
    });

    expect(status).toMatchObject({
      id: 'minimax-task-1',
      model: 'MiniMax-H3',
      status: 'in_progress',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('polls MiniMax-H3 through the default v1 endpoint', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(
        'https://video.example.com/v1/videos/minimax-v1-task-1'
      );

      return new Response(
        JSON.stringify({
          id: 'minimax-v1-task-1',
          model: 'MiniMax-H3',
          status: 'in_progress',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    const status = await queryVideoStatus('minimax-v1-task-1', {
      apiKey: 'video-secret',
      baseUrl: 'https://video.example.com/v1',
      defaultModel: 'MiniMax-H3',
      authType: 'bearer',
      fetchImpl,
    });

    expect(status).toMatchObject({
      id: 'minimax-v1-task-1',
      model: 'MiniMax-H3',
      status: 'in_progress',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('uses manual binding submit path for shared video submission', async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe('https://video.example.com/custom/videos');
        expect(init?.method).toBe('POST');
        expect(init?.body).toBeInstanceOf(FormData);

        return new Response(
          JSON.stringify({
            id: 'custom-video-task-1',
            status: 'queued',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    );

    const remoteId = await submitVideoGeneration(
      {
        prompt: 'make a video',
        model: 'custom-video-model',
      },
      {
        apiKey: 'video-secret',
        baseUrl: 'https://video.example.com/v1',
        authType: 'bearer',
        fetchImpl,
        binding: {
          id: 'provider-manual:custom-video-model:video:manual:openai.video.form-input-reference',
          profileId: 'provider-manual',
          modelId: 'custom-video-model',
          operation: 'video',
          protocol: 'openai.async.video',
          requestSchema: 'openai.video.form-input-reference',
          responseSchema: 'openai.async.task',
          submitPath: '/custom/videos',
          pollPathTemplate: '/custom/videos/{taskId}',
          priority: 900,
          confidence: 'high',
          source: 'manual',
        },
      }
    );

    expect(remoteId).toBe('custom-video-task-1');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('submits Xingliu text-to-video as JSON with minimum-cost metadata', async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe('https://video.example.com/v1/videos');
        expect(init?.method).toBe('POST');
        expect(init?.body).not.toBeInstanceOf(FormData);
        const headers = init?.headers as Record<string, string>;
        expect(headers['Content-Type']).toBe('application/json');

        const body = JSON.parse(String(init?.body));
        expect(body).toEqual({
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
        expect(body.size).toBeUndefined();

        return new Response(
          JSON.stringify({
            id: 'video-task-1',
            status: 'unknown',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    );

    const remoteId = await submitVideoGeneration(
      {
        prompt: 'white ball rolling on a table',
        model: 'doubao-seedance-2-0-fast-260128',
        size: '1280x720',
      },
      {
        apiKey: 'video-secret',
        baseUrl: 'https://video.example.com/v1',
        authType: 'bearer',
        binding: xingliuVideoBinding,
        fetchImpl,
      }
    );

    expect(remoteId).toBe('video-task-1');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('filters unsupported Xingliu metadata in shared video API', async () => {
    const fetchImpl = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        expect(body.metadata).toMatchObject({
          resolution: '480p',
          ratio: '16:9',
        });

        return new Response(
          JSON.stringify({
            id: 'video-task-1',
            status: 'unknown',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    );

    await submitVideoGeneration(
      {
        prompt: 'white ball rolling on a table',
        model: 'doubao-seedance-2-0-fast-260128',
        size: '1080p',
        params: {
          aspect_ratio: 'adaptive',
          xingliu_resolution: '1080p',
        },
      },
      {
        apiKey: 'video-secret',
        baseUrl: 'https://video.example.com/v1',
        authType: 'bearer',
        binding: xingliuVideoBinding,
        fetchImpl,
      }
    );
  });

  it('submits Xingliu image-to-video as multipart image payload', async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === 'data:image/png;base64,abc123') {
          return new Response(new Blob(['ref'], { type: 'image/png' }), {
            status: 200,
          });
        }

        expect(String(input)).toBe('https://video.example.com/v1/videos');
        expect(init?.method).toBe('POST');
        expect(init?.body).toBeInstanceOf(FormData);
        const formData = init?.body as FormData;
        expect([...formData.keys()].sort()).toEqual([
          'image',
          'metadata',
          'model',
          'prompt',
          'seconds',
        ]);
        expect(formData.get('model')).toBe('doubao-seedance-2-0-fast-260128');
        expect(formData.get('prompt')).toBe('animate reference image');
        expect(formData.get('seconds')).toBe('5');
        expect(JSON.parse(String(formData.get('metadata')))).toEqual({
          resolution: '480p',
          ratio: '16:9',
          generate_audio: false,
          watermark: false,
        });
        expect(formData.get('image')).toBeInstanceOf(Blob);
        expect(formData.has('input_reference')).toBe(false);
        expect(formData.has('size')).toBe(false);

        return new Response(
          JSON.stringify({
            id: 'video-task-1',
            status: 'unknown',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    );

    const remoteId = await submitVideoGeneration(
      {
        prompt: 'animate reference image',
        model: 'doubao-seedance-2-0-fast-260128',
        size: '1280x720',
        referenceImages: ['data:image/png;base64,abc123'],
      },
      {
        apiKey: 'video-secret',
        baseUrl: 'https://video.example.com/v1',
        authType: 'bearer',
        binding: xingliuVideoBinding,
        fetchImpl,
      }
    );

    expect(remoteId).toBe('video-task-1');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
