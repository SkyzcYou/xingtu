import { describe, expect, it } from 'vitest';
import { ModelVendor, type ModelConfig } from '../../constants/model-config';
import {
  findMatchingSelectableModel,
  getSelectionKey,
} from '../model-selection';

function createModel(
  profileId: string,
  modelId: string
): ModelConfig {
  return {
    id: modelId,
    label: modelId,
    type: 'image',
    vendor: ModelVendor.OTHER,
    sourceProfileId: profileId,
    selectionKey: getSelectionKey(modelId, {
      profileId,
      modelId,
    }),
  };
}

describe('model selection', () => {
  it('按显式渠道匹配同名模型', () => {
    const models = [
      createModel('provider-a', 'shared-image-model'),
      createModel('provider-b', 'shared-image-model'),
    ];

    expect(
      findMatchingSelectableModel(models, 'shared-image-model', {
        profileId: 'provider-b',
        modelId: 'shared-image-model',
      })
    ).toBe(models[1]);
  });

  it('显式渠道不存在时不会回退到其他渠道的同名模型', () => {
    const models = [createModel('provider-a', 'shared-image-model')];

    expect(
      findMatchingSelectableModel(models, 'shared-image-model', {
        profileId: 'provider-missing',
        modelId: 'shared-image-model',
      })
    ).toBeUndefined();
  });

  it('legacy-default 引用可以匹配无来源的静态模型', () => {
    const staticModel: ModelConfig = {
      id: 'static-image-model',
      label: 'static-image-model',
      type: 'image',
      vendor: ModelVendor.OTHER,
      selectionKey: 'static-image-model',
    };
    const models = [staticModel];

    expect(
      findMatchingSelectableModel(models, staticModel.id, {
        profileId: 'legacy-default',
        modelId: staticModel.id,
      })
    ).toBe(staticModel);
  });
});
