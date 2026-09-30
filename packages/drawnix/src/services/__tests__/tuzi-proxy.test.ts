import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getTuziProxyUpstreamAlias,
  isXingtuBrowserDeployment,
  resolveTuziProxyRequestUrl,
} from '../provider-routing/tuzi-proxy';

describe('tuzi same-origin proxy resolver', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['api.tu-zi.com', 'api'],
    ['apicdn.tu-zi.com', 'apicdn'],
    ['apius.tu-zi.com', 'apius'],
  ] as const)('maps %s to the fixed %s alias', (hostname, alias) => {
    expect(getTuziProxyUpstreamAlias(`https://${hostname}/v1/models`)).toBe(
      alias
    );
  });

  it('rewrites trusted Tuzi URLs on the production Xingtu origin', () => {
    vi.stubGlobal('location', {
      hostname: 'xingtu.live',
      origin: 'https://xingtu.live',
    });

    expect(isXingtuBrowserDeployment()).toBe(true);
    expect(
      resolveTuziProxyRequestUrl(
        'https://apius.tu-zi.com/v1/images/generations/result?request_id=task-1'
      )
    ).toBe(
      'https://xingtu.live/__tuzi_proxy__/apius/v1/images/generations/result?request_id=task-1'
    );
  });

  it('uses the current www origin and keeps query parameters', () => {
    vi.stubGlobal('location', {
      hostname: 'www.xingtu.live',
      origin: 'https://www.xingtu.live',
    });

    expect(
      resolveTuziProxyRequestUrl(
        'https://api.tu-zi.com/v1/models?include=images&limit=10'
      )
    ).toBe(
      'https://www.xingtu.live/__tuzi_proxy__/api/v1/models?include=images&limit=10'
    );
  });

  it('leaves non-Tuzi providers and non-production hosts direct', () => {
    vi.stubGlobal('location', {
      hostname: 'preview.example.com',
      origin: 'https://preview.example.com',
    });

    expect(isXingtuBrowserDeployment()).toBe(false);
    expect(resolveTuziProxyRequestUrl('https://api.tu-zi.com/v1/models')).toBe(
      'https://api.tu-zi.com/v1/models'
    );

    vi.stubGlobal('location', {
      hostname: 'xingtu.live',
      origin: 'https://xingtu.live',
    });
    expect(
      resolveTuziProxyRequestUrl('https://custom.example.com/v1/models')
    ).toBe('https://custom.example.com/v1/models');
    expect(
      resolveTuziProxyRequestUrl('https://api.sydney-ai.com/v1/models')
    ).toBe('https://api.sydney-ai.com/v1/models');
  });

  it('rejects non-HTTPS or arbitrary Tuzi-like origins', () => {
    expect(getTuziProxyUpstreamAlias('http://api.tu-zi.com/v1/models')).toBe(
      null
    );
    expect(getTuziProxyUpstreamAlias('https://evil.tu-zi.com/v1/models')).toBe(
      null
    );
    expect(getTuziProxyUpstreamAlias('/v1/models')).toBe(null);
  });
});
