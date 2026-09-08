import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getCompatibleParams,
  getDefaultAudioModel,
  getDefaultImageModel,
  getDefaultSizeForModel,
  getDefaultTextModel,
  getDefaultVideoModel,
  getModelConfig,
  type ModelConfig,
} from '../../constants/model-config';
import { useSelectableModels } from '../../hooks/use-runtime-models';
import {
  loadAIInputPreferences,
  loadScopedAIInputModelParams,
  saveAIInputPreferences,
  saveScopedAIInputModelParams,
} from '../../services/ai-generation-preferences-service';
import { getEffectiveVideoCompatibleParams } from '../../services/video-binding-utils';
import type { GenerationType } from '../../utils/ai-input-parser';
import {
  getPersistedModelSelection,
  setPersistedModelSelection,
  type PersistedGenerationType,
} from '../../utils/ai-model-selection-storage';
import { applyForcedSunoParams } from '../../utils/suno-model-aliases';
import {
  createModelRef,
  LEGACY_DEFAULT_PROVIDER_PROFILE_ID,
  resolveInvocationRoute,
  type ModelRef,
} from '../../utils/settings-manager';
import type { ChatSessionGenerationState } from '../../types/chat.types';

function getSelectionKey(modelId: string, modelRef?: ModelRef | null): string {
  return modelRef?.profileId ? `${modelRef.profileId}::${modelId}` : modelId;
}

function getSelectionKeyForModel(
  model: Pick<ModelConfig, 'id' | 'selectionKey' | 'sourceProfileId'>
): string {
  return (
    model.selectionKey ||
    (model.sourceProfileId ? `${model.sourceProfileId}::${model.id}` : model.id)
  );
}

function getModelRefFromConfig(model?: ModelConfig | null): ModelRef | null {
  if (!model) {
    return null;
  }

  return createModelRef(model.sourceProfileId || null, model.id);
}

function resolveStoredModelRef(
  type: PersistedGenerationType,
  modelId?: string | null,
  model?: ModelConfig | null,
  route?: ReturnType<typeof resolveInvocationRoute>
): ModelRef | null {
  if (!modelId) {
    return getModelRefFromConfig(model);
  }

  const persisted = getPersistedModelSelection(type);
  if (persisted?.modelId === modelId) {
    return createModelRef(persisted.profileId, modelId);
  }

  const resolvedRoute = route || resolveInvocationRoute(getRouteType(type));
  if (resolvedRoute.modelId === modelId) {
    return createModelRef(resolvedRoute.profileId, modelId);
  }

  return getModelRefFromConfig(model);
}

function findMatchingSelectableModel(
  models: ModelConfig[],
  modelId: string,
  modelRef?: ModelRef | null
): ModelConfig | undefined {
  const expectedKey = getSelectionKey(modelId, modelRef);
  const expectedProfileId = modelRef?.profileId ?? null;

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

  if (expectedProfileId !== null) {
    return undefined;
  }

  return (
    models.find((model) => model.id === modelId && !model.sourceProfileId) ||
    models.find((model) => model.id === modelId)
  );
}

function resolveGenerationTypeForModelSelection(
  currentGenerationType: GenerationType,
  modelType: ModelConfig['type']
): GenerationType {
  if (currentGenerationType === 'agent' && modelType === 'text') {
    return 'agent';
  }

  return modelType as GenerationType;
}

function getFallbackModelId(generationType: GenerationType): string {
  if (generationType === 'video') return getDefaultVideoModel();
  if (generationType === 'audio') return getDefaultAudioModel();
  if (generationType === 'text' || generationType === 'agent') {
    return getDefaultTextModel();
  }
  return getDefaultImageModel();
}

function getRouteType(
  generationType: GenerationType
): 'image' | 'video' | 'audio' | 'text' {
  if (generationType === 'video') return 'video';
  if (generationType === 'audio') return 'audio';
  if (generationType === 'text' || generationType === 'agent') return 'text';
  return 'image';
}

function areParamsEqual(
  a: Record<string, string>,
  b: Record<string, string>
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return (
    aKeys.length === bKeys.length && aKeys.every((key) => a[key] === b[key])
  );
}

function areModelRefsEqual(
  a?: ModelRef | null,
  b?: ModelRef | null
): boolean {
  return (
    (a?.profileId || null) === (b?.profileId || null) &&
    (a?.modelId || null) === (b?.modelId || null)
  );
}

function areGenerationStatesEqual(
  a: ChatSessionGenerationState,
  b: ChatSessionGenerationState
): boolean {
  return (
    a.generationType === b.generationType &&
    a.selectedModel === b.selectedModel &&
    areModelRefsEqual(a.selectedModelRef, b.selectedModelRef) &&
    a.selectedCount === b.selectedCount &&
    areParamsEqual(a.selectedParams, b.selectedParams)
  );
}

function toGenerationState(
  preferences: ReturnType<typeof loadAIInputPreferences>,
  selectedModelRef: ModelRef | null = null
): ChatSessionGenerationState {
  return {
    generationType: preferences.generationType,
    selectedModel: preferences.selectedModel,
    selectedModelRef,
    selectedParams: preferences.selectedParams,
    selectedCount: preferences.selectedCount,
  };
}

interface UseChatDrawerGenerationControlsOptions {
  sessionId?: string | null;
  sessionGenerationState?: ChatSessionGenerationState | null;
  onSessionGenerationStateChange?: (
    state: ChatSessionGenerationState
  ) => void;
}

export function useChatDrawerGenerationControls(
  options: UseChatDrawerGenerationControlsOptions = {}
) {
  const { onSessionGenerationStateChange } = options;
  const imageModels = useSelectableModels('image');
  const videoModels = useSelectableModels('video');
  const audioModels = useSelectableModels('audio');
  const textModels = useSelectableModels('text');
  const initialPreferences = useMemo(() => loadAIInputPreferences(), []);
  const initialGenerationState = useMemo(
    () => options.sessionGenerationState || toGenerationState(initialPreferences),
    []
  );

  const [generationType, setGenerationType] = useState<GenerationType>(
    initialGenerationState.generationType
  );
  const [selectedModel, setSelectedModel] = useState(
    initialGenerationState.selectedModel
  );
  const [selectedModelRef, setSelectedModelRef] = useState<ModelRef | null>(
    initialGenerationState.selectedModelRef || null
  );
  const [selectedParams, setSelectedParams] = useState<Record<string, string>>(
    initialGenerationState.selectedParams
  );
  const [selectedCount, setSelectedCount] = useState(
    initialGenerationState.selectedCount
  );

  const selectedParamsRef = useRef(selectedParams);
  const selectedParamScopeRef = useRef(
    `${generationType}:${getSelectionKey(selectedModel, selectedModelRef)}`
  );
  const currentGenerationStateRef = useRef<ChatSessionGenerationState>({
    generationType,
    selectedModel,
    selectedModelRef,
    selectedParams,
    selectedCount,
  });
  const isRestoringGenerationStateRef = useRef(false);
  const lastEmittedGenerationStateRef = useRef<{
    sessionId: string | null | undefined;
    state: ChatSessionGenerationState;
  } | null>(null);

  useEffect(() => {
    selectedParamsRef.current = selectedParams;
  }, [selectedParams]);

  useEffect(() => {
    currentGenerationStateRef.current = {
      generationType,
      selectedModel,
      selectedModelRef,
      selectedParams,
      selectedCount,
    };
  }, [
    generationType,
    selectedCount,
    selectedModel,
    selectedModelRef,
    selectedParams,
  ]);

  useEffect(() => {
    const nextState =
      options.sessionGenerationState || toGenerationState(loadAIInputPreferences());

    const lastEmittedState = lastEmittedGenerationStateRef.current;
    if (
      lastEmittedState &&
      lastEmittedState.sessionId === options.sessionId &&
      areGenerationStatesEqual(lastEmittedState.state, nextState)
    ) {
      // A parent echo can arrive after model/parameter normalization. It must
      // not restore the older state over the newer local selection.
      return;
    }

    if (areGenerationStatesEqual(currentGenerationStateRef.current, nextState)) {
      return;
    }

    setGenerationType(nextState.generationType);
    setSelectedModel(nextState.selectedModel);
    setSelectedModelRef(nextState.selectedModelRef || null);
    setSelectedParams(nextState.selectedParams);
    setSelectedCount(nextState.selectedCount);
    selectedParamsRef.current = nextState.selectedParams;
    selectedParamScopeRef.current = `${
      nextState.generationType === 'agent'
        ? 'agent'
        : `${nextState.generationType}:${getSelectionKey(
            nextState.selectedModel,
            nextState.selectedModelRef
          )}`
    }`;
    currentGenerationStateRef.current = nextState;
    isRestoringGenerationStateRef.current = true;
  }, [options.sessionGenerationState, options.sessionId]);

  const currentModels = useMemo(() => {
    if (generationType === 'video') return videoModels;
    if (generationType === 'audio') return audioModels;
    if (generationType === 'text' || generationType === 'agent') {
      return textModels;
    }
    return imageModels;
  }, [audioModels, generationType, imageModels, textModels, videoModels]);

  const resolvePreferredModelSelection = useCallback(
    (type: GenerationType, models: ModelConfig[]) => {
      const route = resolveInvocationRoute(getRouteType(type));
      const routeModel = findMatchingSelectableModel(
        models,
        route.modelId,
        createModelRef(route.profileId, route.modelId)
      );
      if (routeModel) {
        return routeModel;
      }

      const fallbackModelId = getFallbackModelId(type);
      return (
        findMatchingSelectableModel(models, fallbackModelId, null) ||
        getModelConfig(fallbackModelId) ||
        models[0]
      );
    },
    []
  );

  useEffect(() => {
    const currentModelConfig = findMatchingSelectableModel(
      currentModels,
      selectedModel,
      selectedModelRef
    );
    const nextModelConfig =
      currentModelConfig ||
      resolvePreferredModelSelection(generationType, currentModels);

    if (nextModelConfig) {
      const nextModelRef =
        selectedModelRef?.modelId === nextModelConfig.id
          ? selectedModelRef
          : resolveStoredModelRef(
              generationType,
              nextModelConfig.id,
              nextModelConfig
            );
      const currentSelectionKey = getSelectionKey(
        selectedModel,
        selectedModelRef
      );
      const nextSelectionKey = getSelectionKey(
        nextModelConfig.id,
        nextModelRef
      );
      if (currentSelectionKey !== nextSelectionKey) {
        setSelectedModel(nextModelConfig.id);
        setSelectedModelRef(nextModelRef);
      }
    }

    if (
      generationType === 'agent' ||
      generationType === 'text' ||
      generationType === 'audio'
    ) {
      setSelectedCount(1);
    }
  }, [
    currentModels,
    generationType,
    resolvePreferredModelSelection,
    selectedModel,
    selectedModelRef,
  ]);

  const compatibleParams = useMemo(() => {
    if (generationType === 'agent') return [];
    if (generationType === 'video') {
      return getEffectiveVideoCompatibleParams(
        selectedModel,
        selectedModelRef || selectedModel,
        selectedParams
      );
    }

    const params = getCompatibleParams(selectedModel);
    if (generationType !== 'audio') {
      return params;
    }

    const sunoAction =
      selectedParams.sunoAction ||
      params.find((param) => param.id === 'sunoAction')?.defaultValue ||
      'music';
    if (sunoAction === 'lyrics') {
      return params.filter(
        (param) =>
          param.id === 'sunoAction' ||
          param.id === 'mv' ||
          param.id === 'title' ||
          param.id === 'tags'
      );
    }

    return params;
  }, [generationType, selectedModel, selectedModelRef, selectedParams]);

  useEffect(() => {
    const currentScopeKey =
      generationType === 'agent'
        ? 'agent'
        : `${generationType}:${getSelectionKey(
            selectedModel,
            selectedModelRef
          )}`;
    const baseParams =
      generationType === 'agent'
        ? {}
        : selectedParamScopeRef.current === currentScopeKey
        ? selectedParamsRef.current || {}
        : loadScopedAIInputModelParams(
            generationType,
            selectedModel,
            getSelectionKey(selectedModel, selectedModelRef),
            selectedParamsRef.current
          );
    const nextParams: Record<string, string> = {};

    const sizeParam = compatibleParams.find((param) => param.id === 'size');
    const prevSize = baseParams.size;
    const prevSizeIsValid =
      !prevSize ||
      !sizeParam?.options ||
      sizeParam.options.some((option) => option.value === prevSize);
    if (!selectedModel.startsWith('mj') && sizeParam) {
      nextParams.size =
        prevSize && prevSizeIsValid
          ? prevSize
          : sizeParam.defaultValue || getDefaultSizeForModel(selectedModel);
    }

    compatibleParams.forEach((param) => {
      if (param.id === 'size') return;
      const prevValue = baseParams[param.id];
      const prevValueIsValid =
        !prevValue ||
        param.valueType !== 'enum' ||
        !param.options ||
        param.options.some((option) => option.value === prevValue);
      if (prevValue && prevValueIsValid) {
        nextParams[param.id] = prevValue;
      } else if (param.defaultValue) {
        nextParams[param.id] = param.defaultValue;
      }
    });

    const normalizedParams = applyForcedSunoParams(selectedModel, nextParams);
    if (!areParamsEqual(selectedParamsRef.current || {}, normalizedParams)) {
      setSelectedParams(normalizedParams);
      selectedParamsRef.current = normalizedParams;
    }
    selectedParamScopeRef.current = currentScopeKey;
  }, [compatibleParams, generationType, selectedModel, selectedModelRef]);

  useEffect(() => {
    const nextGenerationState: ChatSessionGenerationState = {
      generationType,
      selectedModel,
      selectedModelRef,
      selectedParams,
      selectedCount,
    };

    if (isRestoringGenerationStateRef.current) {
      if (!areGenerationStatesEqual(
        nextGenerationState,
        currentGenerationStateRef.current
      )) {
        return;
      }
      isRestoringGenerationStateRef.current = false;
    }

    const lastEmittedState = lastEmittedGenerationStateRef.current;
    if (
      lastEmittedState &&
      lastEmittedState.sessionId === options.sessionId &&
      areGenerationStatesEqual(lastEmittedState.state, nextGenerationState)
    ) {
      return;
    }

    saveAIInputPreferences({
      generationType,
      selectedModel,
      selectedParams,
      selectedCount,
      selectedSkillId: 'auto',
    });
    if (generationType !== 'agent') {
      saveScopedAIInputModelParams(
        generationType,
        selectedModel,
        selectedParams,
        getSelectionKey(selectedModel, selectedModelRef)
      );
    }
    if (onSessionGenerationStateChange) {
      lastEmittedGenerationStateRef.current = {
        sessionId: options.sessionId,
        state: nextGenerationState,
      };
      onSessionGenerationStateChange(nextGenerationState);
    }
  }, [
    generationType,
    onSessionGenerationStateChange,
    options.sessionId,
    selectedCount,
    selectedModel,
    selectedModelRef,
    selectedParams,
  ]);

  const applyModelSelection = useCallback(
    (model: ModelConfig, modelRef?: ModelRef | null) => {
      const nextGenerationType = resolveGenerationTypeForModelSelection(
        generationType,
        model.type
      );
      const nextModelRef = modelRef ?? getModelRefFromConfig(model);
      setGenerationType(nextGenerationType);
      setSelectedModel(model.id);
      setSelectedModelRef(nextModelRef);
      setPersistedModelSelection(
        nextGenerationType as PersistedGenerationType,
        {
          modelId: model.id,
          modelRef: nextModelRef,
          providerIdHint: model.sourceProfileId || nextModelRef?.profileId,
          vendorHint: model.vendor,
        }
      );
      setSelectedParams(
        nextGenerationType === 'agent'
          ? {}
          : loadScopedAIInputModelParams(
              nextGenerationType,
              model.id,
              getSelectionKey(model.id, nextModelRef)
            )
      );
    },
    [generationType]
  );

  const handleModelSelect = useCallback(
    (modelId: string, modelRef?: ModelRef | null) => {
      const hasExplicitModelRef = modelRef !== undefined;
      const model =
        findMatchingSelectableModel(currentModels, modelId, modelRef || null) ||
        (!hasExplicitModelRef
          ? findMatchingSelectableModel(currentModels, modelId, null)
          : undefined) ||
        getModelConfig(modelId);
      if (!model) return;
      applyModelSelection(model, modelRef);
    },
    [applyModelSelection, currentModels]
  );

  const handleModelConfigSelect = useCallback(
    (model: ModelConfig, modelRef?: ModelRef | null) => {
      applyModelSelection(model, modelRef);
    },
    [applyModelSelection]
  );

  const handleParamSelect = useCallback((paramId: string, value?: string) => {
    setSelectedParams((prev) => {
      const next = { ...prev };
      if (value === undefined || value === '') {
        delete next[paramId];
      } else {
        next[paramId] = value;
      }
      return next;
    });
  }, []);

  return {
    generationType,
    setGenerationType,
    selectedModel,
    selectedModelRef,
    selectedSelectionKey: getSelectionKey(selectedModel, selectedModelRef),
    selectedParams,
    compatibleParams,
    selectedCount,
    setSelectedCount,
    currentModels,
    handleModelSelect,
    handleModelConfigSelect,
    handleParamSelect,
  };
}
