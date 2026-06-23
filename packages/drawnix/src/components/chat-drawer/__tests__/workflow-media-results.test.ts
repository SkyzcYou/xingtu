import { describe, expect, it } from 'vitest';
import type { WorkflowMessageData } from '../../../types/chat.types';
import {
  collectWorkflowMediaResults,
  getLatestWorkflowImageReferences,
  shouldUseImplicitWorkflowReferences,
} from '../workflow-media-results';

function createWorkflow(
  id: string,
  urls: string[],
  status: WorkflowMessageData['status'] = 'completed'
): WorkflowMessageData {
  return {
    id,
    name: '图片生成',
    generationType: 'image',
    prompt: '生成图片',
    count: urls.length,
    status,
    steps: [
      {
        id: `${id}-step`,
        description: '生成图片',
        status: 'completed',
        mcp: 'generate_image',
        args: {},
        result: {
          data: {
            urls,
          },
        },
      },
    ],
  };
}

describe('workflow media result helpers', () => {
  it('collects media urls from nested workflow results', () => {
    const workflow = createWorkflow('wf-1', [
      '/images/one.png',
      '/images/two.png',
    ]);

    expect(collectWorkflowMediaResults(workflow)).toEqual([
      {
        type: 'image',
        url: '/images/one.png',
        thumbnailUrl: undefined,
        title: undefined,
      },
      {
        type: 'image',
        url: '/images/two.png',
        thumbnailUrl: undefined,
        title: undefined,
      },
    ]);
  });

  it('deduplicates media urls and reads common single-url fields', () => {
    const workflow = createWorkflow('wf-2', []);
    workflow.steps[0].result = {
      imageUrl: '/images/one.png',
      data: {
        url: '/images/one.png',
        videoUrl: '/videos/one.mp4',
      },
    };

    expect(collectWorkflowMediaResults(workflow)).toEqual([
      {
        type: 'image',
        url: '/images/one.png',
        thumbnailUrl: undefined,
        title: undefined,
      },
      {
        type: 'video',
        url: '/videos/one.mp4',
        thumbnailUrl: undefined,
        title: undefined,
      },
    ]);
  });

  it('collects media urls from nested content objects and arrays', () => {
    const workflow = createWorkflow('wf-content', []);
    workflow.steps[0].result = {
      result: {
        content: [
          { imageUrl: '/images/content.png' },
          { videoUrl: '/videos/content.mp4' },
        ],
      },
    };

    expect(collectWorkflowMediaResults(workflow)).toEqual([
      {
        type: 'image',
        url: '/images/content.png',
        thumbnailUrl: undefined,
        title: undefined,
      },
      {
        type: 'video',
        url: '/videos/content.mp4',
        thumbnailUrl: undefined,
        title: undefined,
      },
    ]);
  });

  it('pairs thumbnail arrays with media urls', () => {
    const workflow = createWorkflow('wf-thumbs', []);
    workflow.steps[0].result = {
      urls: ['/images/one.png', '/images/two.png'],
      thumbnailUrls: ['/thumbs/one.png', '/thumbs/two.png'],
    };

    expect(collectWorkflowMediaResults(workflow)).toEqual([
      {
        type: 'image',
        url: '/images/one.png',
        thumbnailUrl: '/thumbs/one.png',
        title: undefined,
      },
      {
        type: 'image',
        url: '/images/two.png',
        thumbnailUrl: '/thumbs/two.png',
        title: undefined,
      },
    ]);
  });

  it('deduplicates the same url across nested fields', () => {
    const workflow = createWorkflow('wf-dedupe', []);
    workflow.steps[0].result = {
      imageUrl: '/images/one.png',
      content: {
        urls: ['/images/one.png'],
      },
    };

    expect(collectWorkflowMediaResults(workflow)).toHaveLength(1);
  });

  it('returns the latest workflow images as reference content', () => {
    const first = createWorkflow('wf-1', ['/images/old.png']);
    const latest = createWorkflow('wf-2', ['/images/latest-1.png']);

    expect(getLatestWorkflowImageReferences([first, latest])).toEqual([
      {
        type: 'image',
        url: '/images/latest-1.png',
        name: '上一次生成结果 1',
      },
    ]);
  });

  it('recognizes continuation prompts without matching unrelated prompts', () => {
    expect(shouldUseImplicitWorkflowReferences('把上面的人改成小李子')).toBe(
      true
    );
    expect(shouldUseImplicitWorkflowReferences('continue with the previous image')).toBe(
      true
    );
    expect(shouldUseImplicitWorkflowReferences('生成一只猫')).toBe(false);
  });
});
