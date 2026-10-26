import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProviderProfile } from '../utils/settings-manager';
import { discoverProviderModels } from './provider-model-catalog';

const mocks = vi.hoisted(() => ({
  discover: vi.fn(),
  discoverForProfile: vi.fn(),
  fetchAndCache: vi.fn(),
  resolveProviderPricingConfig: vi.fn(),
}));

vi.mock('../utils/runtime-model-discovery', () => ({
  runtimeModelDiscovery: {
    discover: mocks.discover,
    discoverForProfile: mocks.discoverForProfile,
  },
}));

vi.mock('../utils/model-pricing-service', () => ({
  resolveProviderPricingConfig: mocks.resolveProviderPricingConfig,
  modelPricingService: {
    fetchAndCache: mocks.fetchAndCache,
  },
}));

vi.mock('../utils/settings-manager', () => ({
  LEGACY_DEFAULT_PROVIDER_PROFILE_ID: 'legacy-default',
  TUZI_PROVIDER_DEFAULT_BASE_URL: 'https://api.tu-zi.com/v1',
}));

function profile(overrides: Partial<ProviderProfile> = {}): ProviderProfile {
  return {
    id: 'tuzi-token-default',
    name: 'Tuzi default',
    apiKey: 'test-key',
    baseUrl: 'https://api.tu-zi.com/v1',
    enabled: true,
    capabilities: { supportsModelsEndpoint: true },
    ...overrides,
  } as ProviderProfile;
}

describe('provider model catalog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.discover.mockResolvedValue([]);
    mocks.resolveProviderPricingConfig.mockImplementation((profile: ProviderProfile) => ({
      pricingUrl: 'https://api.tu-zi.com/api/pricing',
      pricingGroup: profile.pricingGroup || 'default',
      cnyPerUsd: 0.7,
    }));
    mocks.fetchAndCache.mockResolvedValue({
      profileId: 'tuzi-token-default',
      fetchedAt: Date.now(),
      groups: [],
      prices: {
        'gpt-image-2.5': {
          description: 'Configured marketplace model',
        },
      },
      modelEndpoints: {
        'gpt-image-2.5': {
          generate: { path: '/v1/images/generations' },
        },
      },
    });
  });

  it('uses the Tuzi marketplace as the authoritative model catalog', async () => {
    await discoverProviderModels(profile(), [], {
      forceMarketplaceRefresh: true,
    });

    expect(mocks.fetchAndCache).toHaveBeenCalledWith(
      'tuzi-token-default',
      'https://api.tu-zi.com/api/pricing',
      'test-key',
      'default',
      0.7,
      { force: true }
    );
    expect(mocks.discover).toHaveBeenCalledWith(
      'tuzi-token-default',
      'https://api.tu-zi.com/v1',
      'test-key',
      [],
      {
        selectAll: undefined,
        signal: undefined,
        authoritativeModels: [
          {
            id: 'gpt-image-2.5',
            description: 'Configured marketplace model',
            supported_endpoint_types: ['generate'],
          },
        ],
      }
    );
  });

  it('keeps the models endpoint behavior for non-Tuzi providers', async () => {
    await discoverProviderModels(
      profile({
        id: 'custom-provider',
        baseUrl: 'https://models.example.com/v1',
      })
    );

    expect(mocks.fetchAndCache).not.toHaveBeenCalled();
    expect(mocks.discover).toHaveBeenCalledWith(
      'custom-provider',
      'https://models.example.com/v1',
      'test-key',
      [],
      {
        selectAll: undefined,
        signal: undefined,
        authoritativeModels: undefined,
      }
    );
  });

  it('uses the current login session for account providers without a stored API key', async () => {
    const account = profile({
      id: 'xingtu-login',
      apiKey: '',
      credentialSource: 'oidc-session',
    });
    const models = [{ id: 'account-model' }];
    mocks.discoverForProfile.mockResolvedValueOnce(models);
    const controller = new AbortController();

    await expect(
      discoverProviderModels(account, [], {
        selectAll: true,
        signal: controller.signal,
      })
    ).resolves.toBe(models);

    expect(mocks.discoverForProfile).toHaveBeenCalledWith(account, {
      selectAll: true,
      signal: controller.signal,
    });
    expect(mocks.fetchAndCache).not.toHaveBeenCalled();
    expect(mocks.discover).not.toHaveBeenCalled();
  });

  it('preserves marketplace category and vendor metadata', async () => {
    mocks.fetchAndCache.mockResolvedValue({
      prices: { 'custom-renderer': { description: 'Configured image' } },
      modelCatalog: {
        'custom-renderer': {
          category: '生图',
          tags: '生图,图片编辑',
          owned_by: 'Gemini',
          supported_endpoint_types: ['google.generateContent'],
        },
      },
    });

    await discoverProviderModels(profile({ pricingGroup: 'image' }));

    expect(mocks.fetchAndCache.mock.calls[0][3]).toBe('image');
    expect(mocks.discover.mock.calls[0][4].authoritativeModels).toEqual([
      {
        id: 'custom-renderer',
        description: 'Configured image',
        category: '生图',
        tags: '生图,图片编辑',
        owned_by: 'Gemini',
        supported_endpoint_types: ['google.generateContent'],
      },
    ]);
  });

  it.each([
    'Pricing API error: 404',
    'Pricing API error: 503',
    'Invalid pricing API response',
    '价格接口请求失败：Unauthorized, invalid access token',
    '模型广场请求超时，请稍后重试',
    'Failed to fetch',
  ])('falls back to authenticated model discovery when pricing fails: %s', async (message) => {
    mocks.fetchAndCache.mockRejectedValueOnce(new Error(message));
    const models = [{ id: 'unpriced-model' }];
    mocks.discover.mockResolvedValueOnce(models);
    const controller = new AbortController();
    const currentProfile = profile({
      baseUrl: 'https://apius.tu-zi.com/v1',
      apiKey: ' test-key ',
    });
    const fallbackBaseUrls = ['https://apicdn.tu-zi.com/v1'];

    await expect(discoverProviderModels(currentProfile, fallbackBaseUrls, {
      selectAll: true,
      signal: controller.signal,
    })).resolves.toBe(models);
    expect(mocks.discover).toHaveBeenCalledExactlyOnceWith(
      currentProfile.id,
      currentProfile.baseUrl,
      'test-key',
      fallbackBaseUrls,
      {
        selectAll: true,
        signal: controller.signal,
        authoritativeModels: undefined,
      }
    );
  });

  it('fetches models without prices when the marketplace catalog is empty', async () => {
    mocks.fetchAndCache.mockResolvedValueOnce({ prices: {} });
    const models = [{ id: 'unpriced-model' }];
    mocks.discover.mockResolvedValueOnce(models);

    await expect(discoverProviderModels(profile())).resolves.toBe(models);
    expect(mocks.discover.mock.calls[0][4].authoritativeModels).toBeUndefined();
  });

  it('fetches models when no pricing endpoint is configured', async () => {
    mocks.resolveProviderPricingConfig.mockReturnValueOnce(null);
    const models = [{ id: 'unpriced-model' }];
    mocks.discover.mockResolvedValueOnce(models);

    await expect(discoverProviderModels(profile())).resolves.toBe(models);
    expect(mocks.fetchAndCache).not.toHaveBeenCalled();
    expect(mocks.discover.mock.calls[0][4].authoritativeModels).toBeUndefined();
  });

  it('reports the models endpoint failure when pricing and model discovery both fail', async () => {
    mocks.fetchAndCache.mockRejectedValueOnce(new Error('Invalid pricing API response'));
    const modelError = new Error('获取模型列表失败: HTTP 401');
    mocks.discover.mockRejectedValueOnce(modelError);

    await expect(discoverProviderModels(profile())).rejects.toBe(modelError);
  });

  it('does not start discovery for an already canceled request', async () => {
    const controller = new AbortController();
    const reason = new Error('已取消模型获取');
    controller.abort(reason);

    await expect(discoverProviderModels(profile(), [], {
      signal: controller.signal,
    })).rejects.toBe(reason);
    expect(mocks.fetchAndCache).not.toHaveBeenCalled();
    expect(mocks.discover).not.toHaveBeenCalled();
  });

  it('does not start fallback model discovery after cancellation', async () => {
    const controller = new AbortController();
    const reason = new Error('已取消模型获取');
    mocks.fetchAndCache.mockImplementationOnce(async () => {
      controller.abort(reason);
      throw new Error('Pricing API error: 503');
    });

    await expect(discoverProviderModels(profile(), [], {
      signal: controller.signal,
    })).rejects.toBe(reason);
    expect(mocks.discover).not.toHaveBeenCalled();
  });
});
