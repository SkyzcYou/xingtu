import { beforeEach, describe, expect, it, vi } from 'vitest';

const modelId = 'doubao-seedance-2-0-fast-260128';

function mockXingliuSettings() {
  vi.doMock('../../utils/settings-manager', () => ({
    DEFAULT_PROVIDER_IMAGE_API_COMPATIBILITY: 'openai-gpt-image',
    DEFAULT_PROVIDER_VIDEO_API_COMPATIBILITY: 'auto',
    LEGACY_DEFAULT_PROVIDER_IMAGE_API_COMPATIBILITY: 'tuzi-gpt-image',
    LEGACY_DEFAULT_PROVIDER_PROFILE_ID: 'legacy-default',
    TUZI_DEFAULT_PROVIDER_NAME: '星图 AI',
    TUZI_PROVIDER_DEFAULT_BASE_URL: 'https://api.example.com/v1',
    createModelRef: (profileId?: string | null, model?: string | null) =>
      profileId && model ? { profileId, modelId: model } : null,
    geminiSettings: {
      get: () => ({
        apiKey: 'legacy-key',
        baseUrl: 'https://api.example.com/v1',
        textModelName: 'text-model',
        imageModelName: 'image-model',
        videoModelName: modelId,
        audioModelName: 'audio-model',
      }),
    },
    providerProfilesSettings: {
      get: () => [
        {
          id: 'xingliu-provider',
          name: '星流',
          providerType: 'openai-compatible',
          baseUrl: 'https://ai.example.com/v1',
          apiKey: 'key',
          authType: 'bearer',
          videoApiCompatibility: 'xingliu-video',
          enabled: true,
          capabilities: {
            supportsModelsEndpoint: true,
            supportsText: true,
            supportsImage: true,
            supportsVideo: true,
            supportsAudio: true,
            supportsTools: true,
          },
        },
      ],
    },
    providerCatalogsSettings: {
      get: () => [
        {
          profileId: 'xingliu-provider',
          discoveredAt: 1,
          discoveredModels: [
            {
              id: modelId,
              label: 'Seedance 2.0 Fast',
              type: 'video',
              vendor: 'DOUBAO',
            },
          ],
          selectedModelIds: [modelId],
        },
      ],
    },
    providerPricingCacheSettings: {
      get: () => [],
    },
    resolveInvocationRoute: () => ({
      routeType: 'video',
      modelId,
      profileId: 'xingliu-provider',
      profileName: '星流',
      providerType: 'openai-compatible',
      baseUrl: 'https://ai.example.com/v1',
      apiKey: 'key',
      source: 'preset',
    }),
  }));
}

describe('Xingliu video params', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('uses minimal-cost defaults for runtime Seedance params', async () => {
    mockXingliuSettings();

    const { clearRuntimeModelConfigs, ModelVendor, setRuntimeModelConfigs } =
      await import('../../constants/model-config');
    setRuntimeModelConfigs([
      {
        id: modelId,
        label: 'Seedance 2.0 Fast',
        type: 'video',
        vendor: ModelVendor.DOUBAO,
      },
    ]);

    const { getEffectiveVideoCompatibleParams } = await import(
      '../video-binding-utils'
    );
    const params = getEffectiveVideoCompatibleParams(modelId, {
      profileId: 'xingliu-provider',
      modelId,
    });
    clearRuntimeModelConfigs();
    const paramById = new Map(params.map((param) => [param.id, param]));

    expect([...paramById.keys()]).toEqual(
      expect.arrayContaining([
        'duration',
        'size',
        'aspect_ratio',
        'generate_audio',
        'watermark',
      ])
    );
    expect(paramById.get('duration')?.defaultValue).toBe('5');
    expect(paramById.get('duration')?.options?.map((option) => option.value)).toEqual([
      '5',
      '10',
    ]);
    expect(paramById.get('size')?.defaultValue).toBe('480p');
    expect(paramById.get('size')?.options?.map((option) => option.value)).toEqual([
      '480p',
      '720p',
      '1080p',
    ]);
    expect(paramById.get('aspect_ratio')?.defaultValue).toBe('16:9');
    expect(paramById.get('generate_audio')?.defaultValue).toBe('false');
    expect(paramById.get('watermark')?.defaultValue).toBe('false');
  });
});
