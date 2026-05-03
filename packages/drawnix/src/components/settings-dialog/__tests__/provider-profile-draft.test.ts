import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('createProviderProfileDraft', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('window', {
      location: {
        search: '',
        href: 'https://example.com/app',
      },
      history: {
        replaceState: () => {},
      },
      dispatchEvent: () => true,
    });
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    });
  });

  it('defaults new profiles to OpenAI GPT Image compatibility', async () => {
    const { createProviderProfileDraft } = await import(
      '../provider-profile-draft'
    );

    expect(createProviderProfileDraft(3, 'profile-3')).toMatchObject({
      id: 'profile-3',
      name: '供应商 3',
      homepageUrl: '',
      providerType: 'openai-compatible',
      authType: 'bearer',
      imageApiCompatibility: 'openai-gpt-image',
      enabled: true,
      capabilities: {
        supportsModelsEndpoint: true,
        supportsText: true,
        supportsImage: true,
        supportsVideo: true,
        supportsAudio: true,
        supportsTools: true,
      },
    });
  });
});
