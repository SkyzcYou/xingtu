import { beforeEach, describe, expect, it, vi } from 'vitest';

const xingliuModelIds = [
  'doubao-seedance-2-0-fast-260128',
  'doubao-seedance-2-0-720p',
  'doubao-seedance-2-0-1080p',
  'seedance-1-5-pro-with-audio',
  'seedance-1-5-pro-no-audio',
  'seedance-nsfw',
  'seedance-nsfw-720p',
  'seedance-nsfw-1080p',
  'seedance-fast-nsfw',
];

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
        videoModelName: xingliuModelIds[0],
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
          discoveredModels: xingliuModelIds.map((id) => ({
            id,
            label: id,
            type: 'video',
            vendor: 'DOUBAO',
          })),
          selectedModelIds: xingliuModelIds,
        },
      ],
    },
    providerPricingCacheSettings: {
      get: () => [],
    },
    resolveInvocationRoute: () => ({
      routeType: 'video',
      modelId: xingliuModelIds[0],
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

  it.each([
    ['doubao-seedance-2-0-fast-260128', ['480p', '720p']],
    ['doubao-seedance-2-0-720p', ['480p', '720p']],
    ['doubao-seedance-2-0-1080p', ['480p', '720p', '1080p']],
    ['seedance-1-5-pro-with-audio', ['480p', '720p']],
    ['seedance-1-5-pro-no-audio', ['480p', '720p']],
    ['seedance-nsfw', ['480p']],
    ['seedance-nsfw-720p', ['480p', '720p']],
    ['seedance-nsfw-1080p', ['480p', '720p', '1080p']],
    ['seedance-fast-nsfw', ['480p', '720p']],
  ])('customizes Xingliu video params for %s', async (modelId, sizes) => {
    mockXingliuSettings();

    const { clearRuntimeModelConfigs, ModelVendor, setRuntimeModelConfigs } =
      await import('../../constants/model-config');
    setRuntimeModelConfigs(
      xingliuModelIds.map((id) => ({
        id,
        label: id,
        type: 'video' as const,
        vendor: ModelVendor.DOUBAO,
      }))
    );

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
    expect(paramById.get('size')?.options?.map((option) => option.value)).toEqual(
      sizes
    );
    expect(paramById.get('aspect_ratio')?.defaultValue).toBe('16:9');
    expect(
      paramById.get('aspect_ratio')?.options?.map((option) => option.value)
    ).toEqual(['16:9', '9:16', '1:1', '4:3', '3:4', '21:9']);
    expect(paramById.get('generate_audio')?.defaultValue).toBe('false');
    expect(paramById.get('watermark')?.defaultValue).toBe('false');
  });
});
