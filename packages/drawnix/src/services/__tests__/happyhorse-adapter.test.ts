import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { happyHorseVideoAdapter } from '../model-adapters/happyhorse-adapter';
import type { AdapterContext } from '../model-adapters/types';

vi.mock('../unified-cache-service', () => ({
  unifiedCacheService: {
    getImageForAI: vi.fn(async (url: string) => ({ type: 'url', value: url })),
  },
}));

vi.mock('../media-executor/fallback-utils', () => ({
  ensureBase64ForAI: vi.fn(async (imageData: { value: string }) =>
    imageData.value.startsWith('data:')
      ? imageData.value
      : 'data:image/png;base64,converted'
  ),
}));

describe('happyhorse video adapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('submits T2V requests as HappyHorse JSON payloads', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ url: String(input), init: init || {} });
        if ((init?.method || 'GET') === 'POST') {
          return new Response(
            JSON.stringify({
              id: 'task-1',
              task_id: 'task-1',
              status: 'submitted',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({
            id: 'task-1',
            task_id: 'task-1',
            status: 'completed',
            progress: 100,
            url: 'https://cdn.example.com/happyhorse.mp4',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    );

    const context: AdapterContext = {
      baseUrl: 'https://vexrouter.com/v1',
      apiKey: 'sk-test',
      authType: 'bearer',
      operation: 'video',
      fetcher,
    };

    const resultPromise = happyHorseVideoAdapter.generateVideo(context, {
      model: 'happyhorse-1.0-t2v',
      prompt: 'tiny city at night',
      size: '720P',
      duration: 4,
      params: {
        ratio: '9:16',
        watermark: 'false',
        seed: '42',
      },
    });

    await vi.advanceTimersByTimeAsync(5000);
    const result = await resultPromise;

    expect(result.url).toBe('https://cdn.example.com/happyhorse.mp4');
    expect(requests[0]?.url).toBe('https://vexrouter.com/v1/videos');
    expect(requests[0]?.init.headers).toMatchObject({
      Authorization: 'Bearer sk-test',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(requests[0]?.init.body))).toEqual({
      model: 'happyhorse-1.0-t2v',
      prompt: 'tiny city at night',
      parameters: {
        resolution: '720P',
        ratio: '9:16',
        duration: 4,
        watermark: false,
        seed: 42,
      },
    });
    expect(requests[1]?.url).toBe('https://vexrouter.com/v1/videos/task-1');
  });

  it('defaults watermark to false and only sends seed when provided', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ url: String(input), init: init || {} });
        if ((init?.method || 'GET') === 'POST') {
          return new Response(
            JSON.stringify({
              id: 'task-1',
              task_id: 'task-1',
              status: 'submitted',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({
            id: 'task-1',
            task_id: 'task-1',
            status: 'completed',
            progress: 100,
            url: 'https://cdn.example.com/happyhorse.mp4',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    );

    const resultPromise = happyHorseVideoAdapter.generateVideo(
      {
        baseUrl: 'https://vexrouter.com/v1',
        apiKey: 'sk-test',
        authType: 'bearer',
        operation: 'video',
        fetcher,
      },
      {
        model: 'happyhorse-1.0-r2v',
        prompt: 'reference image animation',
        size: '1080P',
        params: {
          ratio: '16:9',
        },
        referenceImages: ['https://example.com/ref.png'],
      }
    );

    await vi.advanceTimersByTimeAsync(5000);
    await resultPromise;

    const body = JSON.parse(String(requests[0]?.init.body));
    expect(body.parameters).toMatchObject({
      resolution: '1080P',
      ratio: '16:9',
      watermark: false,
    });
    expect(body.input_reference).toEqual(['data:image/png;base64,converted']);
    expect(body).not.toHaveProperty('image');
    expect(body).not.toHaveProperty('images');
    expect(body.parameters).not.toHaveProperty('seed');
  });

  it('accepts explicit seed values', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ url: String(input), init: init || {} });
        if ((init?.method || 'GET') === 'POST') {
          return new Response(
            JSON.stringify({
              id: 'task-1',
              task_id: 'task-1',
              status: 'submitted',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({
            id: 'task-1',
            task_id: 'task-1',
            status: 'completed',
            progress: 100,
            url: 'https://cdn.example.com/happyhorse.mp4',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    );

    const resultPromise = happyHorseVideoAdapter.generateVideo(
      {
        baseUrl: 'https://vexrouter.com/v1',
        apiKey: 'sk-test',
        authType: 'bearer',
        operation: 'video',
        fetcher,
      },
      {
        model: 'happyhorse-1.0-r2v',
        prompt: 'reference image animation',
        size: '1080P',
        params: {
          ratio: '16:9',
          seed: '2147483647',
        },
        referenceImages: ['https://example.com/ref.png'],
      }
    );

    await vi.advanceTimersByTimeAsync(5000);
    await resultPromise;

    const body = JSON.parse(String(requests[0]?.init.body));
    expect(body.parameters.seed).toBe(2147483647);
  });

  it('maps R2V input_reference arrays to base64 input_reference arrays', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ url: String(input), init: init || {} });
        if ((init?.method || 'GET') === 'POST') {
          return new Response(
            JSON.stringify({
              id: 'task-1',
              task_id: 'task-1',
              status: 'submitted',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({
            id: 'task-1',
            task_id: 'task-1',
            status: 'completed',
            progress: 100,
            url: 'https://cdn.example.com/happyhorse.mp4',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    );

    const resultPromise = happyHorseVideoAdapter.generateVideo(
      {
        baseUrl: 'https://vexrouter.com/v1',
        apiKey: 'sk-test',
        authType: 'bearer',
        operation: 'video',
        fetcher,
      },
      {
        model: 'happyhorse-1.0-r2v',
        prompt: 'reference image animation',
        params: {
          input_reference: [
            'https://example.com/ref-1.png',
            'https://example.com/ref-2.png',
          ],
        },
      }
    );

    await vi.advanceTimersByTimeAsync(5000);
    await resultPromise;

    const body = JSON.parse(String(requests[0]?.init.body));
    expect(body.input_reference).toEqual([
      'data:image/png;base64,converted',
      'data:image/png;base64,converted',
    ]);
    expect(body).not.toHaveProperty('image');
    expect(body).not.toHaveProperty('images');
  });

  it('submits Video Edit with video and optional input_reference only', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ url: String(input), init: init || {} });
        if ((init?.method || 'GET') === 'POST') {
          return new Response(
            JSON.stringify({
              id: 'task-1',
              task_id: 'task-1',
              status: 'submitted',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({
            id: 'task-1',
            task_id: 'task-1',
            status: 'completed',
            progress: 100,
            url: 'https://cdn.example.com/happyhorse.mp4',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    );

    const resultPromise = happyHorseVideoAdapter.generateVideo(
      {
        baseUrl: 'https://vexrouter.com/v1',
        apiKey: 'sk-test',
        authType: 'bearer',
        operation: 'video',
        fetcher,
      },
      {
        model: 'happyhorse-1.0-video-edit',
        prompt: 'keep the motion, change the style',
        size: '720P@9:16',
        duration: 12,
        params: {
          video: 'https://example.com/input.mp4',
          image: 'https://example.com/reference.png',
          audio_setting: 'origin',
          ratio: '9:16',
        },
      }
    );

    await vi.advanceTimersByTimeAsync(5000);
    await resultPromise;

    const body = JSON.parse(String(requests[0]?.init.body));
    expect(body).toMatchObject({
      model: 'happyhorse-1.0-video-edit',
      prompt: 'keep the motion, change the style',
      video: 'https://example.com/input.mp4',
      input_reference: 'data:image/png;base64,converted',
      parameters: {
        resolution: '720P',
        watermark: false,
        audio_setting: 'origin',
      },
    });
    expect(body).not.toHaveProperty('image');
    expect(body).not.toHaveProperty('images');
    expect(body.parameters).not.toHaveProperty('duration');
    expect(body.parameters).not.toHaveProperty('ratio');
  });

  it('requires a first frame for I2V requests', async () => {
    await expect(
      happyHorseVideoAdapter.generateVideo(
        {
          baseUrl: 'https://vexrouter.com/v1',
          apiKey: 'sk-test',
          authType: 'bearer',
          operation: 'video',
          fetcher: vi.fn(),
        },
        {
          model: 'happyhorse-1.0-i2v',
          prompt: 'animate the frame',
        }
      )
    ).rejects.toThrow('需要首帧图片');
  });

  it('normalizes explicit I2V image params to base64 payloads', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ url: String(input), init: init || {} });
        if ((init?.method || 'GET') === 'POST') {
          return new Response(
            JSON.stringify({
              id: 'task-1',
              task_id: 'task-1',
              status: 'submitted',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({
            id: 'task-1',
            task_id: 'task-1',
            status: 'completed',
            progress: 100,
            url: 'https://cdn.example.com/happyhorse.mp4',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    );

    const resultPromise = happyHorseVideoAdapter.generateVideo(
      {
        baseUrl: 'https://vexrouter.com/v1',
        apiKey: 'sk-test',
        authType: 'bearer',
        operation: 'video',
        fetcher,
      },
      {
        model: 'happyhorse-1.0-i2v',
        prompt: 'animate the explicit frame',
        params: {
          image: 'https://example.com/frame.png',
        },
      }
    );

    await vi.advanceTimersByTimeAsync(5000);
    await resultPromise;

    const body = JSON.parse(String(requests[0]?.init.body));
    expect(body.input_reference).toBe('data:image/png;base64,converted');
    expect(body).not.toHaveProperty('image');
    expect(body).not.toHaveProperty('images');
  });
});
