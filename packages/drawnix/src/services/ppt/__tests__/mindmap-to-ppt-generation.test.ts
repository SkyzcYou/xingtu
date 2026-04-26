import { createTestingBoard } from '@plait/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MindElement } from '@plait/mind';
import { generatePPTFromMindmap } from '../mindmap-to-ppt';
import { PPT_FRAME_HEIGHT, PPT_FRAME_WIDTH } from '../ppt-layout-engine';

const mocks = vi.hoisted(() => ({
  createImageTask: vi.fn(),
}));

vi.mock('../../../mcp/tools/image-generation', () => ({
  createImageTask: mocks.createImageTask,
}));

function buildMindData(text: string) {
  return {
    topic: {
      children: [{ text }],
    },
  };
}

function buildMindElement(
  text: string,
  children: MindElement[] = [],
  isRoot = false
): MindElement {
  const element: any = {
    id: `mock-${text}`,
    data: buildMindData(text),
    children,
    width: 100,
    height: 40,
  };
  if (isRoot) {
    element.type = 'mindmap';
    element.points = [
      [0, 0],
      [100, 40],
    ];
    element.isRoot = true;
  }
  return element as MindElement;
}

describe('generatePPTFromMindmap image-first output', () => {
  beforeEach(() => {
    mocks.createImageTask.mockReset();
    mocks.createImageTask.mockResolvedValue({ success: true });
  });

  it('creates one frame and one PPT slide image task per outline page', async () => {
    const board = createTestingBoard([], []) as any;
    const mindmap = buildMindElement(
      '项目计划',
      [
        buildMindElement('需求分析', [buildMindElement('用户调研')]),
        buildMindElement('方案设计', [buildMindElement('技术选型')]),
      ],
      true
    );

    const result = await generatePPTFromMindmap(board, mindmap);

    expect(result).toMatchObject({
      success: true,
      pageCount: 5,
    });

    const frames = board.children.filter(
      (element: any) => element.type === 'frame'
    );
    expect(frames).toHaveLength(5);
    expect(board.children).toHaveLength(5);
    expect(mocks.createImageTask).toHaveBeenCalledTimes(5);

    frames.forEach((frame: any, index: number) => {
      expect(frame.pptMeta).toMatchObject({
        pageIndex: index + 1,
        slideImageStatus: 'loading',
        imageStatus: 'loading',
      });
      expect(frame.pptMeta.styleSpec).toBeDefined();
      expect(frame.pptMeta.styleSpec.visualStyle).toContain(
        'presentation design'
      );
      expect(frame.pptMeta.slidePrompt).toContain(
        '完整的 16:9 PowerPoint 幻灯片图片'
      );
      expect(frame.pptMeta.slidePrompt).not.toContain('全局风格规格');
      expect(frame.pptMeta.commonPrompt).toContain('公共提示词');
      expect(frame.pptMeta.commonPrompt).toContain(
        frame.pptMeta.styleSpec.visualStyle
      );

      const taskPrompt = mocks.createImageTask.mock.calls[index][0].prompt;
      expect(taskPrompt).toContain(frame.pptMeta.commonPrompt);
      expect(taskPrompt).toContain(frame.pptMeta.slidePrompt);
      expect(mocks.createImageTask).toHaveBeenNthCalledWith(
        index + 1,
        expect.objectContaining({
          prompt: taskPrompt,
          size: '16x9',
          pptSlidePrompt: frame.pptMeta.slidePrompt,
          autoInsertToCanvas: true,
          targetFrameId: frame.id,
          targetFrameDimensions: {
            width: PPT_FRAME_WIDTH,
            height: PPT_FRAME_HEIGHT,
          },
          pptSlideImage: true,
        })
      );
    });
  });
});
