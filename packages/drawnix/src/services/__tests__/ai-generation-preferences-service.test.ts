// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('ai-generation-preferences-service', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('兼容旧 text 偏好并恢复为 agent 模式', async () => {
    localStorage.setItem(
      'aitu_ai_input_preferences',
      JSON.stringify({
        value: {
          generationType: 'text',
          selectedModel: 'deepseek-v3.2',
          selectedParams: {},
          selectedCount: 1,
          selectedSkillId: 'skill-123',
        },
        updatedAt: Date.now(),
      })
    );

    const { loadAIInputPreferences } = await import(
      '../ai-generation-preferences-service'
    );

    expect(loadAIInputPreferences()).toMatchObject({
      generationType: 'agent',
      selectedModel: 'deepseek-v3.2',
      selectedCount: 1,
      selectedSkillId: 'skill-123',
    });
  });

  it('保存并恢复文本生成模式偏好', async () => {
    const {
      loadAIInputPreferences,
      saveAIInputPreferences,
    } = await import('../ai-generation-preferences-service');

    saveAIInputPreferences({
      generationType: 'agent',
      selectedModel: 'deepseek-v3.2',
      selectedParams: {},
      selectedCount: 1,
      selectedSkillId: 'skill-123',
    });

    saveAIInputPreferences({
      generationType: 'text',
      selectedModel: 'deepseek-v3.2',
      selectedParams: {},
      selectedCount: 1,
      selectedSkillId: 'auto',
    });

    expect(loadAIInputPreferences()).toMatchObject({
      generationType: 'text',
      selectedModel: 'deepseek-v3.2',
      selectedCount: 1,
    });
  });

  it('按 selectionKey 为 AI 输入栏隔离模型参数', async () => {
    const {
      loadScopedAIInputModelParams,
      saveScopedAIInputModelParams,
    } = await import('../ai-generation-preferences-service');

    saveScopedAIInputModelParams(
      'audio',
      'suno_music',
      { sunoAction: 'music', instrumental: 'true' },
      'provider-a::suno_music'
    );
    saveScopedAIInputModelParams(
      'audio',
      'suno_music',
      { sunoAction: 'lyrics' },
      'provider-b::suno_music'
    );

    expect(
      loadScopedAIInputModelParams(
        'audio',
        'suno_music',
        'provider-a::suno_music'
      )
    ).toMatchObject({ sunoAction: 'music', instrumental: 'true' });
    expect(
      loadScopedAIInputModelParams(
        'audio',
        'suno_music',
        'provider-b::suno_music'
      )
    ).toMatchObject({ sunoAction: 'lyrics' });
  });

  it('按模型作用域恢复图片工具偏好', async () => {
    const {
      loadScopedAIImageToolPreferences,
      saveAIImageToolPreferences,
    } = await import('../ai-generation-preferences-service');

    saveAIImageToolPreferences({
      currentModel: 'doubao-seedream-4-5-251128',
      currentSelectionKey: 'provider-a::doubao-seedream-4-5-251128',
      extraParams: { seedream_quality: '4k' },
      aspectRatio: '16:9',
    });

    expect(
      loadScopedAIImageToolPreferences(
        'doubao-seedream-4-5-251128',
        'provider-a::doubao-seedream-4-5-251128'
      )
    ).toMatchObject({
      extraParams: { seedream_quality: '4k' },
      aspectRatio: '16:9',
    });
  });

  it('将 GPT Image 的旧 quality 档位偏好迁移到 resolution', async () => {
    localStorage.setItem(
      'aitu_ai_image_tool_preferences',
      JSON.stringify({
        value: {
          currentModel: 'gpt-image-2',
          currentSelectionKey: 'provider-a::gpt-image-2',
          extraParams: {
            quality: '2k',
          },
          aspectRatio: '16:9',
          scopedPreferences: {
            'provider-a::gpt-image-2': {
              modelId: 'gpt-image-2',
              selectionKey: 'provider-a::gpt-image-2',
              extraParams: {
                quality: '2k',
              },
              aspectRatio: '16:9',
            },
          },
        },
        updatedAt: Date.now(),
      })
    );

    const { loadScopedAIImageToolPreferences } = await import(
      '../ai-generation-preferences-service'
    );

    expect(
      loadScopedAIImageToolPreferences(
        'gpt-image-2',
        'provider-a::gpt-image-2'
      )
    ).toMatchObject({
      extraParams: {
        resolution: '2k',
        quality: 'auto',
      },
      aspectRatio: '16:9',
    });
  });

  it('保留 Gemini preview 的旧 quality 档位语义', async () => {
    localStorage.setItem(
      'aitu_ai_image_tool_preferences',
      JSON.stringify({
        value: {
          currentModel: 'gemini-3-pro-image-preview',
          currentSelectionKey: 'provider-a::gemini-3-pro-image-preview',
          extraParams: {
            quality: '4k',
          },
          aspectRatio: '1:1',
          scopedPreferences: {
            'provider-a::gemini-3-pro-image-preview': {
              modelId: 'gemini-3-pro-image-preview',
              selectionKey: 'provider-a::gemini-3-pro-image-preview',
              extraParams: {
                quality: '4k',
              },
              aspectRatio: '1:1',
            },
          },
        },
        updatedAt: Date.now(),
      })
    );

    const { loadScopedAIImageToolPreferences } = await import(
      '../ai-generation-preferences-service'
    );

    expect(
      loadScopedAIImageToolPreferences(
        'gemini-3-pro-image-preview',
        'provider-a::gemini-3-pro-image-preview'
      )
    ).toMatchObject({
      extraParams: {
        quality: '4k',
      },
      aspectRatio: '1:1',
    });
  });

  it('按模型作用域恢复视频工具偏好', async () => {
    const {
      loadScopedAIVideoToolPreferences,
      saveAIVideoToolPreferences,
    } = await import('../ai-generation-preferences-service');

    saveAIVideoToolPreferences({
      currentModel: 'veo3',
      currentSelectionKey: 'provider-a::veo3',
      extraParams: { aspect_ratio: '16:9' },
      duration: '8',
      size: '1280x720',
    });

    expect(
      loadScopedAIVideoToolPreferences('veo3', 'provider-a::veo3')
    ).toMatchObject({
      extraParams: { aspect_ratio: '16:9' },
      duration: '8',
      size: '1280x720',
    });
  });
});
