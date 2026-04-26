// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { getDefaultPromptsByGenerationType } from '../../constants/prompts';

const mockPromptListPanel = vi.fn();

const historyRecords = [
  { id: 'image-1', content: 'AI 输入图片历史', timestamp: 100, modelType: 'image' },
  { id: 'video-1', content: 'AI 输入视频历史', timestamp: 200, modelType: 'video' },
  { id: 'audio-1', content: 'AI 输入音频历史', timestamp: 300, modelType: 'audio' },
  { id: 'text-1', content: 'AI 输入文本历史', timestamp: 400, modelType: 'text' },
  { id: 'agent-1', content: 'AI 输入 Agent 历史', timestamp: 500, modelType: 'agent' },
];

vi.mock('../../hooks/usePromptHistory', () => ({
  usePromptHistory: (options?: { modelTypeFilter?: string }) => ({
    history: options?.modelTypeFilter
      ? historyRecords.filter(
          (item) => item.modelType === options.modelTypeFilter
        )
      : historyRecords,
    removeHistory: vi.fn(),
    togglePinHistory: vi.fn(),
    refreshHistory: vi.fn(),
  }),
}));

vi.mock('../../hooks/useGenerationHistory', () => ({
  useGenerationHistory: () => ({
    imageHistory: [
      {
        id: 'task-image-1',
        prompt: '任务图片历史',
        timestamp: 600,
        imageUrl: '/task-image.png',
        width: 1024,
        height: 1024,
      },
    ],
    videoHistory: [
      {
        id: 'task-video-1',
        prompt: '任务视频历史',
        timestamp: 700,
        imageUrl: '/task-video-thumb.png',
        previewUrl: '/task-video.mp4',
        downloadUrl: '/task-video.mp4',
        width: 1280,
        height: 720,
      },
    ],
  }),
}));

vi.mock('../dialog/ConfirmDialog', () => ({
  useConfirmDialog: () => ({
    confirm: vi.fn(),
    confirmDialog: null,
  }),
}));

vi.mock('../shared', () => ({
  PromptListPanel: ({
    title,
    items,
  }: {
    title: string;
    items: Array<{
      id: string;
      content: string;
      previewExamples?: Array<{ src: string; alt: string }>;
    }>;
  }) => {
    mockPromptListPanel({ title, items });
    return (
      <div data-testid="prompt-list-panel">
        <div>{title}</div>
        {items.map((item) => (
          <div key={item.id}>{item.content}</div>
        ))}
      </div>
    );
  },
}));

vi.mock('../../services/prompt-storage-service', () => ({
  getImagePromptHistoryContents: () => ['本地图片历史'],
  getVideoPromptHistoryContents: () => ['本地视频历史'],
  promptStorageService: {
    sortPrompts: (_type: string, prompts: string[]) => prompts,
    isPinned: () => false,
    pinPrompt: vi.fn(),
    unpinPrompt: vi.fn(),
    deletePrompt: vi.fn(),
  },
}));

describe('PromptHistoryPopover', () => {
  const openPopover = async (container: HTMLElement) => {
    fireEvent.mouseEnter(
      container.querySelector('.prompt-history-popover__trigger') as HTMLElement
    );
    await vi.advanceTimersByTimeAsync(200);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
  });

  it('图片模式只显示图片提示词来源', async () => {
    const { PromptHistoryPopover } = await import('./PromptHistoryPopover');

    const view = render(
      <PromptHistoryPopover
        generationType="image"
        onSelectPrompt={vi.fn()}
        language="zh"
      />
    );

    await openPopover(view.container);

    expect(screen.getByText('本地图片历史')).toBeTruthy();
    expect(screen.getByText('任务图片历史')).toBeTruthy();
    expect(screen.queryByText('本地视频历史')).toBeNull();
    expect(screen.queryByText('任务视频历史')).toBeNull();
    expect(screen.queryByText('AI 输入视频历史')).toBeNull();
    expect(screen.queryByText('AI 输入音频历史')).toBeNull();
  });

  it('切换到音频模式后只显示音频提示词', async () => {
    const { PromptHistoryPopover } = await import('./PromptHistoryPopover');

    const view = render(
      <PromptHistoryPopover
        generationType="audio"
        onSelectPrompt={vi.fn()}
        language="zh"
      />
    );

    await openPopover(view.container);

    expect(screen.getByText('AI 输入音频历史')).toBeTruthy();
    expect(screen.queryByText('AI 输入图片历史')).toBeNull();
    expect(screen.queryByText('AI 输入视频历史')).toBeNull();
    expect(screen.queryByText('AI 输入文本历史')).toBeNull();
    expect(screen.queryByText('AI 输入 Agent 历史')).toBeNull();
  });

  it('切换到 Agent 模式后只显示 Agent 提示词', async () => {
    const { PromptHistoryPopover } = await import('./PromptHistoryPopover');

    const view = render(
      <PromptHistoryPopover
        generationType="agent"
        onSelectPrompt={vi.fn()}
        language="zh"
      />
    );

    await openPopover(view.container);

    expect(screen.getByText('AI 输入 Agent 历史')).toBeTruthy();
    expect(screen.queryByText('AI 输入图片历史')).toBeNull();
    expect(screen.queryByText('AI 输入视频历史')).toBeNull();
    expect(screen.queryByText('AI 输入音频历史')).toBeNull();
  });

  it.each(['audio', 'text', 'agent'] as const)(
    '%s 模式不会给默认提示词附加内置预览',
    async (generationType) => {
      const { PromptHistoryPopover } = await import('./PromptHistoryPopover');

      const view = render(
        <PromptHistoryPopover
          generationType={generationType}
          onSelectPrompt={vi.fn()}
          language="zh"
        />
      );

      await openPopover(view.container);

      const items = mockPromptListPanel.mock.calls.at(-1)?.[0]?.items as
        | Array<{
            content: string;
            previewExamples?: Array<{ src: string }>;
          }>
        | undefined;

      const defaultPromptItem = items?.find(
        (item) =>
          item.content ===
          getDefaultPromptsByGenerationType(generationType, 'zh')[0]
      );

      expect(defaultPromptItem?.previewExamples).toBeUndefined();
    }
  );

  it('视频模式不会给默认提示词附加内置样片', async () => {
    const { PromptHistoryPopover } = await import('./PromptHistoryPopover');

    const view = render(
      <PromptHistoryPopover
        generationType="video"
        onSelectPrompt={vi.fn()}
        language="zh"
      />
    );

    await openPopover(view.container);

    const items = mockPromptListPanel.mock.calls.at(-1)?.[0]?.items as
      | Array<{
          content: string;
          previewExamples?: Array<{
            kind?: string;
            src: string;
            posterSrc?: string;
          }>;
        }>
      | undefined;

    const defaultPromptItem = items?.find(
      (item) => item.content === getDefaultPromptsByGenerationType('video', 'zh')[0]
    );

    expect(defaultPromptItem?.previewExamples).toEqual([]);
  });

  it('视频模式会给用户生成历史附加真实视频预览', async () => {
    const { PromptHistoryPopover } = await import('./PromptHistoryPopover');

    const view = render(
      <PromptHistoryPopover
        generationType="video"
        onSelectPrompt={vi.fn()}
        language="zh"
      />
    );

    await openPopover(view.container);

    const items = mockPromptListPanel.mock.calls.at(-1)?.[0]?.items as
      | Array<{
          content: string;
          previewExamples?: Array<{
            kind?: string;
            src: string;
            posterSrc?: string;
            playable?: boolean;
          }>;
        }>
      | undefined;

    const generatedVideoItem = items?.find(
      (item) => item.content === '任务视频历史'
    );

    expect(generatedVideoItem?.previewExamples?.[0]).toMatchObject({
      kind: 'video',
      src: '/task-video.mp4',
      posterSrc: '/task-video-thumb.png',
      playable: true,
    });
  });
});
