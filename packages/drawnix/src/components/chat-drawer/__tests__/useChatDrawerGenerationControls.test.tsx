// @vitest-environment jsdom

import React, { useCallback, useState } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatSessionGenerationState } from '../../../types/chat.types';
import type { ModelRef } from '../../../utils/settings-manager';
import { useChatDrawerGenerationControls } from '../useChatDrawerGenerationControls';

const fixtures = vi.hoisted(() => {
  const makeModel = (id: string, type: string) => ({
    id,
    type,
    label: id,
    vendor: 'OTHER',
    sourceProfileId: 'provider-1',
    selectionKey: `provider-1::${id}`,
  });
  const models = {
    image: [makeModel('image-model', 'image'), makeModel('image-alt', 'image')],
    video: [makeModel('video-model', 'video')],
    audio: [makeModel('audio-model', 'audio')],
    text: [makeModel('text-model', 'text')],
  };
  const params = [
    {
      id: 'size',
      valueType: 'enum',
      defaultValue: 'auto',
      options: [{ value: 'auto' }, { value: '1x1' }],
    },
    {
      id: 'quality',
      valueType: 'enum',
      defaultValue: 'high',
      options: [{ value: 'high' }, { value: 'low' }],
    },
  ];
  return {
    models,
    params,
    emptyParams: [],
    preferences: {
      generationType: 'image',
      selectedModel: 'image-model',
      selectedParams: { size: 'auto', quality: 'high' },
      selectedCount: 1,
      selectedSkillId: 'auto',
    },
    savePreferences: vi.fn(),
    saveScopedParams: vi.fn(),
    setPersistedModelSelection: vi.fn(),
  };
});

vi.mock('../../../hooks/use-runtime-models', () => ({
  // Keep model snapshots stable so the tests exercise session feedback only.
  useSelectableModels: (type: keyof typeof fixtures.models) =>
    fixtures.models[type],
}));

vi.mock('../../../constants/model-config', () => ({
  getCompatibleParams: (modelId: string) =>
    modelId === 'text-model' ? fixtures.emptyParams : fixtures.params,
  getDefaultImageModel: () => 'image-model',
  getDefaultVideoModel: () => 'video-model',
  getDefaultAudioModel: () => 'audio-model',
  getDefaultTextModel: () => 'text-model',
  getDefaultSizeForModel: () => 'auto',
  getModelConfig: (modelId: string) =>
    Object.values(fixtures.models)
      .flat()
      .find((model) => model.id === modelId),
}));

vi.mock('../../../services/ai-generation-preferences-service', () => ({
  loadAIInputPreferences: () => fixtures.preferences,
  loadScopedAIInputModelParams: (
    _type: string,
    _modelId: string,
    _selectionKey?: string,
    fallbackParams?: Record<string, string>
  ) => ({ ...fallbackParams }),
  saveAIInputPreferences: fixtures.savePreferences,
  saveScopedAIInputModelParams: fixtures.saveScopedParams,
}));

vi.mock('../../../services/video-binding-utils', () => ({
  getEffectiveVideoCompatibleParams: () => fixtures.params,
}));

vi.mock('../../../utils/ai-model-selection-storage', () => ({
  getPersistedModelSelection: () => null,
  setPersistedModelSelection: fixtures.setPersistedModelSelection,
}));

vi.mock('../../../utils/suno-model-aliases', () => ({
  applyForcedSunoParams: (_modelId: string, params: Record<string, string>) =>
    params,
}));

vi.mock('../../../utils/settings-manager', () => ({
  LEGACY_DEFAULT_PROVIDER_PROFILE_ID: 'legacy-default',
  createModelRef: (profileId?: string | null, modelId?: string | null) =>
    !profileId && !modelId
      ? null
      : { profileId: profileId || null, modelId: modelId || null },
  resolveInvocationRoute: (type: keyof typeof fixtures.models) => ({
    modelId: fixtures.models[type][0].id,
    profileId: 'provider-1',
  }),
}));

type Controls = ReturnType<typeof useChatDrawerGenerationControls>;
interface TestSession {
  id: string;
  generationState: ChatSessionGenerationState;
}

function makeState(
  overrides: Partial<ChatSessionGenerationState> = {}
): ChatSessionGenerationState {
  return {
    generationType: 'image',
    selectedModel: 'image-model',
    selectedModelRef: { profileId: 'provider-1', modelId: 'image-model' },
    selectedParams: { size: 'auto', quality: 'high' },
    selectedCount: 1,
    ...overrides,
  };
}

function readState(controls: Controls): ChatSessionGenerationState {
  return {
    generationType: controls.generationType,
    selectedModel: controls.selectedModel,
    selectedModelRef: controls.selectedModelRef,
    selectedParams: controls.selectedParams,
    selectedCount: controls.selectedCount,
  };
}

function renderParentEcho(
  initialState: ChatSessionGenerationState,
  options: { recreateCallback?: boolean; cloneEcho?: boolean } = {}
) {
  const notifications = vi.fn();
  let controls!: Controls;
  let session!: TestSession;
  let replaceSession!: React.Dispatch<React.SetStateAction<TestSession>>;

  function Parent() {
    const [currentSession, setCurrentSession] = useState<TestSession>({
      id: 'session-1',
      generationState: initialState,
    });
    const onGenerationStateChange = useCallback(
      (state: ChatSessionGenerationState) => {
        // A broken hook should fail promptly, before React can loop forever.
        if (notifications.mock.calls.length >= 25) {
          throw new Error(
            'Generation state did not settle after 25 parent echoes'
          );
        }
        notifications(currentSession.id, state);
        const echoedState = options.cloneEcho
          ? {
              ...state,
              selectedModelRef: state.selectedModelRef
                ? { ...state.selectedModelRef }
                : null,
              selectedParams: { ...state.selectedParams },
            }
          : state;
        setCurrentSession((previous) => ({
          ...previous,
          generationState: echoedState,
        }));
      },
      [currentSession.id]
    );

    controls = useChatDrawerGenerationControls({
      sessionId: currentSession.id,
      sessionGenerationState: currentSession.generationState,
      onSessionGenerationStateChange: options.recreateCallback
        ? (state) => onGenerationStateChange(state)
        : onGenerationStateChange,
    });
    session = currentSession;
    replaceSession = setCurrentSession;
    return null;
  }

  render(<Parent />);
  return {
    notifications,
    get controls() {
      return controls;
    },
    get session() {
      return session;
    },
    replaceSession(next: TestSession) {
      act(() => replaceSession(next));
    },
    updateExternalState(state: ChatSessionGenerationState) {
      act(() =>
        replaceSession((previous) => ({ ...previous, generationState: state }))
      );
    },
    rerenderParent() {
      act(() => replaceSession((previous) => ({ ...previous })));
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useChatDrawerGenerationControls session synchronization', () => {
  it.each([false, true])(
    'settles on a fallback when the persisted model is unavailable (cloned echo: %s)',
    (cloneEcho) => {
      const harness = renderParentEcho(
        makeState({
          selectedModel: 'removed-model',
          selectedModelRef: {
            profileId: 'removed-provider',
            modelId: 'removed-model',
          },
          selectedParams: {},
        }),
        { cloneEcho }
      );

      expect(harness.controls.selectedModel).toBe('image-model');
      expect(harness.controls.selectedModelRef).toEqual({
        profileId: 'provider-1',
        modelId: 'image-model',
      });
      expect(harness.session.generationState).toEqual(
        readState(harness.controls)
      );
      expect(harness.notifications.mock.calls.length).toBeLessThan(6);
    }
  );

  it('keeps agent model, count, and parameter normalization after parent echoes', () => {
    const harness = renderParentEcho(
      makeState({
        generationType: 'agent',
        selectedParams: { quality: 'low' },
        selectedCount: 5,
      })
    );

    expect(harness.controls.selectedModel).toBe('text-model');
    expect(harness.controls.selectedCount).toBe(1);
    expect(harness.controls.selectedParams).toEqual({});
    expect(harness.session.generationState).toEqual(
      readState(harness.controls)
    );
    expect(harness.notifications.mock.calls.length).toBeLessThan(6);
  });

  it('normalizes unsupported parameters without restoring the old values', () => {
    const harness = renderParentEcho(
      makeState({
        selectedParams: { size: 'invalid', quality: 'invalid', removed: 'old' },
      })
    );

    expect(harness.controls.selectedParams).toEqual({
      size: 'auto',
      quality: 'high',
    });
    expect(harness.session.generationState.selectedParams).toEqual({
      size: 'auto',
      quality: 'high',
    });
  });

  it('persists user model, parameter, count, and generation type changes', () => {
    const harness = renderParentEcho(makeState());
    const nextModelRef: ModelRef = {
      profileId: 'provider-1',
      modelId: 'image-alt',
    };

    act(() => harness.controls.handleModelSelect('image-alt', nextModelRef));
    act(() => {
      harness.controls.handleParamSelect('quality', 'low');
      harness.controls.setSelectedCount(3);
    });

    expect(harness.session.generationState).toEqual(
      makeState({
        selectedModel: 'image-alt',
        selectedModelRef: nextModelRef,
        selectedParams: { size: 'auto', quality: 'low' },
        selectedCount: 3,
      })
    );
    expect(fixtures.savePreferences).toHaveBeenLastCalledWith(
      expect.objectContaining({ selectedModel: 'image-alt', selectedCount: 3 })
    );
    expect(fixtures.saveScopedParams).toHaveBeenLastCalledWith(
      'image',
      'image-alt',
      { size: 'auto', quality: 'low' },
      'provider-1::image-alt'
    );

    act(() => harness.controls.setGenerationType('video'));

    expect(harness.controls.selectedModel).toBe('video-model');
    expect(harness.session.generationState).toEqual(
      readState(harness.controls)
    );
    expect(harness.session.generationState.generationType).toBe('video');
  });

  it('restores a different session and its previous settings when switching back', () => {
    const initialState = makeState({ selectedCount: 3 });
    const harness = renderParentEcho(initialState);
    const firstSessionState = harness.session.generationState;
    const secondSessionState = makeState({
      generationType: 'video',
      selectedModel: 'video-model',
      selectedModelRef: { profileId: 'provider-1', modelId: 'video-model' },
      selectedParams: { size: '1x1', quality: 'low' },
      selectedCount: 5,
    });

    harness.replaceSession({
      id: 'session-2',
      generationState: secondSessionState,
    });
    expect(readState(harness.controls)).toEqual(secondSessionState);
    expect(harness.session.generationState).toEqual(secondSessionState);
    expect(harness.notifications).toHaveBeenLastCalledWith(
      'session-2',
      secondSessionState
    );

    harness.replaceSession({
      id: 'session-1',
      generationState: firstSessionState,
    });
    expect(readState(harness.controls)).toEqual(firstSessionState);
    expect(harness.notifications).toHaveBeenLastCalledWith(
      'session-1',
      firstSessionState
    );
  });

  it('notifies a new session even when its settings match the previous session', () => {
    const harness = renderParentEcho(makeState());
    const state = harness.session.generationState;

    harness.replaceSession({ id: 'session-2', generationState: state });

    expect(readState(harness.controls)).toEqual(state);
    expect(harness.notifications).toHaveBeenLastCalledWith('session-2', state);
  });

  it('restores genuine external changes within the same session', () => {
    const harness = renderParentEcho(makeState());
    const externalState = makeState({
      selectedModel: 'image-alt',
      selectedModelRef: { profileId: 'provider-1', modelId: 'image-alt' },
      selectedParams: { size: '1x1', quality: 'low' },
      selectedCount: 2,
    });

    harness.updateExternalState(externalState);

    expect(readState(harness.controls)).toEqual(externalState);
    expect(harness.session.generationState).toEqual(externalState);
    expect(harness.notifications).toHaveBeenLastCalledWith(
      'session-1',
      externalState
    );
  });

  it('does not re-emit unchanged settings when a parent recreates the callback', () => {
    const harness = renderParentEcho(makeState(), { recreateCallback: true });
    const notificationsAfterMount = harness.notifications.mock.calls.length;

    harness.rerenderParent();

    expect(harness.notifications.mock.calls.length).toBe(
      notificationsAfterMount
    );
    expect(harness.session.generationState).toEqual(
      readState(harness.controls)
    );
  });
});
