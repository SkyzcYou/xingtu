// @vitest-environment jsdom
import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModelVendor, type ModelConfig } from '../../constants/model-config';
import { ModelDropdown } from './ModelDropdown';

const { discoverMock, applySelectionMock } = vi.hoisted(() => ({
  discoverMock: vi.fn(),
  applySelectionMock: vi.fn(),
}));

vi.mock('../../utils/runtime-model-discovery', () => ({
  runtimeModelDiscovery: {
    getState: () => ({
      status: 'idle',
      discoveredModels: [],
    }),
    discover: discoverMock,
    applySelection: applySelectionMock,
  },
}));

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
  XINGTU_LOGIN_PROVIDER_PROFILE_ID: 'xingtu-login',
  LEGACY_DEFAULT_PROVIDER_PROFILE_ID: 'legacy-default',
  TUZI_ORIGINAL_PROVIDER_PROFILE_ID: 'tuzi-original',
  TUZI_DEFAULT_PROVIDER_NAME: 'Tuzi',
  TUZI_PROVIDER_ICON_URL: 'https://tuzi.example/icon.png',
  providerCatalogsSettings: {
    get: () => [],
    addListener: () => {},
    removeListener: () => {},
    update: async () => {},
  },
  createModelRef: (profileId: string | null, modelId: string) => ({
    profileId,
    modelId,
  }),
}));

vi.mock('../../hooks/use-model-pricing', () => ({
  useFormattedModelPrice: () => '',
  useModelPriceText: () => ({ summary: '', detail: '' }),
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
    vi.restoreAllMocks();
    discoverMock.mockReset();
    applySelectionMock.mockReset();
    cleanup();
  });

  const baseModel: ModelConfig = {
    id: 'gpt-image-2',
    label: 'GPT Image 2',
    shortCode: 'gpt2',
    type: 'image',
    vendor: ModelVendor.GPT,
    sourceProfileId: 'tuzi-provider',
    sourceProfileName: 'Tuzi Provider',
    selectionKey: 'tuzi-provider::gpt-image-2',
  };

  function mockRect(
    element: Element,
    rect: Pick<DOMRect, 'top' | 'left' | 'bottom' | 'width'>
  ) {
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      x: rect.left,
      y: rect.top,
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.left + rect.width,
      width: rect.width,
      height: rect.bottom - rect.top,
      toJSON: () => ({}),
    } as DOMRect);
  }

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

  it('placement auto 时可渲染 portal 菜单并自动向上避让底部', () => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 600,
    });

    const { container } = render(
      <ModelDropdown
        selectedModel={baseModel.id}
        selectedSelectionKey={baseModel.selectionKey}
        models={[baseModel]}
        onSelect={vi.fn()}
      />
    );
    const wrapper = container.querySelector('.model-dropdown') as HTMLElement;
    mockRect(wrapper, { top: 520, left: 42, bottom: 552, width: 180 });

    fireEvent.mouseDown(
      container.querySelector(
        '.model-dropdown__trigger--minimal'
      ) as HTMLElement
    );

    const menu = document.body.querySelector(
      '.model-dropdown__menu'
    ) as HTMLElement;

    expect(menu).toBeTruthy();
    expect(menu.classList.contains('model-dropdown__menu--up')).toBe(true);
    expect(menu.style.position).toBe('fixed');
    expect(menu.style.left).toBe('42px');
    expect(menu.style.bottom).toBe('84px');
  });

  it('没有候选模型时显示明确空态而不是默认模型代号', () => {
    const { container } = render(
      <ModelDropdown
        selectedModel="doubao-seedance-2-0-260128"
        models={[]}
        onSelect={vi.fn()}
        emptyTriggerLabel="暂无已配置视频模型"
        emptyText="请先在供应商设置中获取并勾选视频模型"
        strictModelList
      />
    );

    const trigger = container.querySelector(
      '.model-dropdown__trigger--minimal'
    ) as HTMLElement;
    expect(trigger.textContent).toContain('暂无已配置视频模型');
    expect(trigger.textContent).not.toContain('#img');
    expect(trigger.getAttribute('aria-label')).toContain('暂无已配置视频模型');

    fireEvent.mouseDown(trigger);

    expect(
      screen.getByText('请先在供应商设置中获取并勾选视频模型')
    ).not.toBeNull();
  });

  it('form 变体的 portal 菜单宽度不小于触发器宽度', () => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 800,
    });

    const { container } = render(
      <ModelDropdown
        selectedModel={baseModel.id}
        selectedSelectionKey={baseModel.selectionKey}
        models={[baseModel]}
        onSelect={vi.fn()}
        variant="form"
      />
    );
    const wrapper = screen.getByTestId('model-selector');
    mockRect(wrapper, { top: 100, left: 24, bottom: 140, width: 680 });

    fireEvent.mouseDown(
      container.querySelector('.model-dropdown__trigger--form') as HTMLElement
    );

    const menu = document.body.querySelector(
      '.model-dropdown__menu'
    ) as HTMLElement;

    expect(menu).toBeTruthy();
    expect(menu.style.width).toBe('680px');
    expect(menu.classList.contains('model-dropdown__menu--down')).toBe(true);
  });

  it('选择列表模型时把渠道引用传给回调', () => {
    const onSelect = vi.fn();

    const { container } = render(
      <ModelDropdown
        selectedModel={baseModel.id}
        selectedSelectionKey={baseModel.selectionKey}
        models={[baseModel]}
        onSelect={onSelect}
      />
    );

    fireEvent.mouseDown(
      container.querySelector('.model-dropdown__trigger--minimal') as HTMLElement
    );
    fireEvent.click(
      document.body.querySelector('.model-dropdown__item') as HTMLElement
    );

    expect(onSelect).toHaveBeenCalledWith(baseModel.id, {
      profileId: 'tuzi-provider',
      modelId: baseModel.id,
    });
  });

  it('选择无来源的静态模型时绑定默认 API KEY 渠道', () => {
    const onSelect = vi.fn();
    const staticModel: ModelConfig = {
      id: 'static-image-model',
      label: 'Static image model',
      shortCode: 'static',
      type: 'image',
      vendor: ModelVendor.OTHER,
    };

    const { container } = render(
      <ModelDropdown
        selectedModel={staticModel.id}
        models={[staticModel]}
        onSelect={onSelect}
      />
    );

    fireEvent.mouseDown(
      container.querySelector('.model-dropdown__trigger--minimal') as HTMLElement
    );
    fireEvent.click(
      document.body.querySelector('.model-dropdown__item') as HTMLElement
    );

    expect(onSelect).toHaveBeenCalledWith(staticModel.id, {
      profileId: 'legacy-default',
      modelId: staticModel.id,
    });
  });

  it('两个模型选择回调共享同一个渠道引用', () => {
    const onSelect = vi.fn();
    const onSelectModel = vi.fn();

    const { container } = render(
      <ModelDropdown
        selectedModel={baseModel.id}
        selectedSelectionKey={baseModel.selectionKey}
        models={[baseModel]}
        onSelect={onSelect}
        onSelectModel={onSelectModel}
      />
    );

    fireEvent.mouseDown(
      container.querySelector('.model-dropdown__trigger--minimal') as HTMLElement
    );
    fireEvent.click(
      document.body.querySelector('.model-dropdown__item') as HTMLElement
    );

    const selectedRef = {
      profileId: 'tuzi-provider',
      modelId: baseModel.id,
    };
    expect(onSelect).toHaveBeenCalledWith(baseModel.id, selectedRef);
    expect(onSelectModel).toHaveBeenCalledWith(baseModel, selectedRef);
  });

  it('输入未发现的模型时绑定当前渠道', () => {
    const onSelect = vi.fn();

    const { container } = render(
      <ModelDropdown
        selectedModel={baseModel.id}
        selectedSelectionKey={baseModel.selectionKey}
        models={[baseModel]}
        onSelect={onSelect}
        variant="form"
      />
    );

    fireEvent.mouseDown(
      container.querySelector('.model-dropdown__trigger--form') as HTMLElement
    );
    const input = container.querySelector(
      '.model-dropdown__form-input'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'custom-image-model' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('custom-image-model', {
      profileId: 'tuzi-provider',
      modelId: 'custom-image-model',
    });
  });

  it('在默认 API KEY 渠道输入自定义模型时保留默认渠道引用', () => {
    const onSelect = vi.fn();
    const defaultModel: ModelConfig = {
      id: 'default-image-model',
      label: 'Default image model',
      shortCode: 'default',
      type: 'image',
      vendor: ModelVendor.OTHER,
    };

    const { container } = render(
      <ModelDropdown
        selectedModel={defaultModel.id}
        selectedSelectionKey={defaultModel.id}
        models={[defaultModel]}
        onSelect={onSelect}
        variant="form"
      />
    );

    fireEvent.mouseDown(
      container.querySelector('.model-dropdown__trigger--form') as HTMLElement
    );
    const input = container.querySelector(
      '.model-dropdown__form-input'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'custom-default-model' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('custom-default-model', {
      profileId: 'legacy-default',
      modelId: 'custom-default-model',
    });
  });

  it('模型查询未完成时强制显示加载动画，完成后移除加载状态', async () => {
    let resolveDiscovery: ((models: ModelConfig[]) => void) | undefined;
    discoverMock.mockImplementation(
      () =>
        new Promise<ModelConfig[]>((resolve) => {
          resolveDiscovery = resolve;
        })
    );

    const managedModel: ModelConfig = {
      ...baseModel,
      sourceProfileId: 'tuzi-managed-default',
      sourceProfileName: 'Tuzi 默认分组',
      selectionKey: 'tuzi-managed-default::gpt-image-2',
    };

    const { container } = render(
      <ModelDropdown
        selectedModel={managedModel.id}
        selectedSelectionKey={managedModel.selectionKey}
        models={[managedModel]}
        providerProfilesOverride={[
          {
            id: 'tuzi-managed-default',
            name: 'Tuzi 默认分组',
            baseUrl: 'https://tuzi.example/v1',
            apiKey: 'sk-test',
            enabled: true,
            providerType: 'openai-compatible',
            authType: 'bearer',
          },
        ]}
        onSelect={vi.fn()}
      />
    );

    fireEvent.mouseDown(
      container.querySelector(
        '.model-dropdown__trigger--minimal'
      ) as HTMLElement
    );

    expect(discoverMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('正在加载模型...')).toBeTruthy();
    const loadingStatus = document.querySelector(
      '.model-dropdown__loading-overlay'
    ) as HTMLElement;
    expect(loadingStatus).toBeTruthy();
    expect(
      loadingStatus.querySelector('.model-dropdown__loading-icon')
    ).not.toBeNull();

    resolveDiscovery?.([managedModel]);
    await waitFor(() => {
      expect(
        document.querySelector('.model-dropdown__loading-overlay')
      ).toBeNull();
    });
  });
});
