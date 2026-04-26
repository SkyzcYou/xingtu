// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockViewer = vi.fn();

vi.mock('./hover', () => ({
  HoverTip: ({
    children,
    content,
  }: {
    children: React.ReactNode;
    content: React.ReactNode;
  }) => (
    <div data-testid="hover-tip">
      {children}
      <div data-testid="hover-tip-content">{content}</div>
    </div>
  ),
}));

vi.mock('./media-preview', () => ({
  UnifiedMediaViewer: (props: Record<string, unknown>) => {
    mockViewer(props);
    return <div data-testid="unified-media-viewer" />;
  },
}));

describe('PromptListPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('点击单张预览图时用对应索引打开共享预览器', async () => {
    const { PromptListPanel } = await import('./PromptListPanel');

    render(
      <PromptListPanel
        title="提示词"
        items={[
          {
            id: 'single',
            content: '用户图片提示词',
            previewExamples: [
              {
                kind: 'image',
                src: '/generated/image-01.png',
                alt: 'single preview',
              },
            ],
          },
        ]}
      />
    );

    fireEvent.mouseDown(screen.getByRole('button', { name: '预览示例图 1' }));

    expect(mockViewer).toHaveBeenCalled();
    expect(mockViewer.mock.calls.at(-1)?.[0]).toMatchObject({
      visible: true,
      initialIndex: 0,
      items: [
        {
          id: 'single-preview-0',
          url: '/generated/image-01.png',
          type: 'image',
          alt: 'single preview',
          title: '用户图片提示词',
        },
      ],
    });
  });

  it('点击多张示例图中的任意一张时从对应索引打开共享预览器', async () => {
    const { PromptListPanel } = await import('./PromptListPanel');

    render(
      <PromptListPanel
        title="提示词"
        items={[
          {
            id: 'multi',
            content: '任务图片历史',
            previewExamples: [
              {
                kind: 'image',
                src: '/task-image-01.png',
                alt: 'preview 1',
              },
              {
                kind: 'image',
                src: '/task-image-02.png',
                alt: 'preview 2',
              },
            ],
          },
        ]}
      />
    );

    fireEvent.mouseDown(screen.getByRole('button', { name: '预览示例图 2' }));

    expect(mockViewer.mock.calls.at(-1)?.[0]).toMatchObject({
      visible: true,
      initialIndex: 1,
      items: [
        {
          id: 'multi-preview-0',
          url: '/task-image-01.png',
          type: 'image',
          alt: 'preview 1',
          title: '任务图片历史',
        },
        {
          id: 'multi-preview-1',
          url: '/task-image-02.png',
          type: 'image',
          alt: 'preview 2',
          title: '任务图片历史',
        },
      ],
    });
  });

  it('非 image/video 类型的预览图也会映射到共享图片预览器', async () => {
    const { PromptListPanel } = await import('./PromptListPanel');

    render(
      <PromptListPanel
        title="提示词"
        items={[
          {
            id: 'audio',
            content: '用户音频提示词',
            modelType: 'audio',
            previewExamples: [
              {
                kind: 'image',
                src: '/generated/audio-cover-01.png',
                alt: 'audio preview',
              },
            ],
          },
        ]}
      />
    );

    fireEvent.mouseDown(screen.getByRole('button', { name: '预览示例图 1' }));

    expect(mockViewer.mock.calls.at(-1)?.[0]).toMatchObject({
      visible: true,
      initialIndex: 0,
      items: [
        {
          id: 'audio-preview-0',
          url: '/generated/audio-cover-01.png',
          type: 'image',
          alt: 'audio preview',
          title: '用户音频提示词',
        },
      ],
    });
  });

  it('视频预览会映射到共享视频预览器并携带封面', async () => {
    const { PromptListPanel } = await import('./PromptListPanel');

    render(
      <PromptListPanel
        title="提示词"
        items={[
          {
            id: 'video-default',
            content: '用户视频提示词',
            modelType: 'video',
            previewExamples: [
              {
                kind: 'video',
                src: '/generated/video-02.mp4',
                posterSrc: '/generated/video-02.png',
                playable: true,
                alt: 'default video preview',
              },
            ],
          },
        ]}
      />
    );

    fireEvent.mouseDown(screen.getByRole('button', { name: '预览示例图 1' }));

    expect(mockViewer.mock.calls.at(-1)?.[0]).toMatchObject({
      visible: true,
      initialIndex: 0,
      videoAutoPlay: true,
      items: [
        {
          id: 'video-default-preview-0',
          url: '/generated/video-02.mp4',
          type: 'video',
          posterUrl: '/generated/video-02.png',
          alt: 'default video preview',
          title: '用户视频提示词',
        },
      ],
    });
  });

  it('真实视频示例图会映射到共享视频预览器并携带封面', async () => {
    const { PromptListPanel } = await import('./PromptListPanel');

    render(
      <PromptListPanel
        title="提示词"
        items={[
          {
            id: 'video',
            content: '默认视频提示词',
            modelType: 'video',
            previewExamples: [
              {
                kind: 'video',
                src: '/generated/video-01.mp4',
                posterSrc: '/generated/video-01.png',
                playable: true,
                alt: 'video preview',
              },
            ],
          },
        ]}
      />
    );

    fireEvent.mouseDown(screen.getByRole('button', { name: '预览示例图 1' }));

    expect(mockViewer.mock.calls.at(-1)?.[0]).toMatchObject({
      visible: true,
      initialIndex: 0,
      videoAutoPlay: true,
      items: [
        {
          id: 'video-preview-0',
          url: '/generated/video-01.mp4',
          type: 'video',
          posterUrl: '/generated/video-01.png',
          alt: 'video preview',
          title: '默认视频提示词',
        },
      ],
    });
  });
});
