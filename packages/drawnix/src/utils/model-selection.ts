import type { ModelConfig } from '../constants/model-config';
import {
  createModelRef,
  LEGACY_DEFAULT_PROVIDER_PROFILE_ID,
  type ModelRef,
} from './settings-manager';

export function getSelectionKey(
  modelId: string,
  modelRef?: ModelRef | null
): string {
  return modelRef?.profileId ? `${modelRef.profileId}::${modelId}` : modelId;
}

export function getSelectionKeyForModel(
  model: Pick<ModelConfig, 'id' | 'selectionKey' | 'sourceProfileId'>
): string {
  return (
    model.selectionKey ||
    (model.sourceProfileId ? `${model.sourceProfileId}::${model.id}` : model.id)
  );
}

export function getModelRefFromConfig(
  model?: Pick<ModelConfig, 'id' | 'sourceProfileId'> | null
): ModelRef | null {
  if (!model) {
    return null;
  }

  return createModelRef(model.sourceProfileId || null, model.id);
}

export function findMatchingSelectableModel(
  models: ModelConfig[],
  modelId?: string | null,
  modelRef?: ModelRef | null
): ModelConfig | undefined {
  if (!modelId) {
    return undefined;
  }

  const expectedKey = getSelectionKey(modelId, modelRef);
  const expectedProfileId = modelRef?.profileId || null;

  const exactMatch = models.find(
    (model) => getSelectionKeyForModel(model) === expectedKey
  );
  if (exactMatch) {
    return exactMatch;
  }

  const profileMatch = models.find(
    (model) =>
      model.id === modelId &&
      ((model.sourceProfileId || null) === expectedProfileId ||
        (expectedProfileId === LEGACY_DEFAULT_PROVIDER_PROFILE_ID &&
          !model.sourceProfileId))
  );
  if (profileMatch) {
    return profileMatch;
  }

  // An explicit provider reference is authoritative. Falling back to a
  // same-named model from another provider silently routes the request to the
  // wrong credentials.
  if (expectedProfileId !== null) {
    return undefined;
  }

  return (
    models.find((model) => model.id === modelId && !model.sourceProfileId) ||
    models.find((model) => model.id === modelId)
  );
}
