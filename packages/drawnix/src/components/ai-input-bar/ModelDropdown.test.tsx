// @vitest-environment jsdom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModelVendor, type ModelConfig } from '../../constants/model-config';
import { ModelDropdown } from './ModelDropdown';

vi.mock('../../hooks/use-drawnix', () => ({
  useDrawnix: () => ({ setAppState: vi.fn() }),
}));

vi.mock('../../hooks/use-provider-profiles', () => ({
  useProviderProfiles: () => [
    {
      id: 'tuzi-provider',
      name: 'Tuzi Provider',
      enabled: true,
    },
  ],
}));

vi.mock('../../utils/settings-manager', () => ({
  LEGACY_DEFAULT_PROVIDER_PROFILE_ID: 'legacy-default',
  TUZI_ORIGINAL_PROVIDER_PROFILE_ID: 'tuzi-original',
  TUZI_DEFAULT_PROVIDER_NAME: 'Tuzi',
  TUZI_PROVIDER_ICON_URL: 'https://tuzi.example/icon.png',
  createModelRef: (profileId: string | null, modelId: string) => ({
    profileId,
    modelId,
  }),
}));

vi.mock('../../hooks/use-model-pricing', () => ({
  useFormattedModelPrice: () => '',
  useModelMeta: () => null,
}));

vi.mock('../../utils/model-pricing-service', () => ({
  modelPricingService: {
    getModelPrice: vi.fn(() => null),
  },
}));

vi.mock('../shared/ModelHealthBadge', () => ({
  ModelHealthBadge: () => null,
}));

vi.mock('../shared/ModelBenchmarkBadge', () => ({
  ModelBenchmarkBadge: () => null,
}));

describe('ModelDropdown', () => {
  afterEach(() => {
    cleanup();
  });

  it('外层反显 HappyHorse 时使用模型厂商 logo', () => {
    const happyHorseModel: ModelConfig = {
      id: 'happyhorse-1.0-i2v',
      label: 'HappyHorse 1.0 I2V',
      shortCode: 'h10i',
      type: 'video',
      vendor: ModelVendor.HAPPYHORSE,
      sourceProfileId: 'tuzi-provider',
      sourceProfileName: 'Tuzi Provider',
      selectionKey: 'tuzi-provider::happyhorse-1.0-i2v',
    };

    const { container } = render(
      <ModelDropdown
        selectedModel={happyHorseModel.id}
        selectedSelectionKey={happyHorseModel.selectionKey}
        models={[happyHorseModel]}
        onSelect={vi.fn()}
      />
    );

    const trigger = container.querySelector(
      '.model-dropdown__trigger--minimal'
    );
    const icon = trigger?.querySelector('img');

    expect(trigger?.textContent).toContain('#h10i');
    expect(icon?.getAttribute('src')).toBe('https://happyhorse.app/logo.webp');
  });
});
