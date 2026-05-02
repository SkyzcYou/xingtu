import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskType, type KnowledgeContextRef } from '../../types/task.types';

const createdTasks: Array<{ id: string; params: any; type: TaskType }> = [];

vi.mock('../../services/task-queue', () => ({
  taskQueueService: {
    createTask: vi.fn((params: any, type: TaskType) => {
      const task = {
        id: `task-${createdTasks.length + 1}`,
        params,
        type,
      };
      createdTasks.push(task);
      return task;
    }),
  },
}));

vi.mock('../../utils/settings-manager', () => ({
  geminiSettings: {
    get: vi.fn(() => ({})),
  },
  createModelRef: (profileId: string, modelId: string) => ({
    profileId,
    modelId,
  }),
}));

vi.mock('../../services/model-adapters', () => ({
  getAdapterContextFromSettings: vi.fn(() => ({})),
  resolveAdapterForInvocation: vi.fn(() => null),
  GPT_IMAGE_EDIT_REQUEST_SCHEMAS: undefined,
  isGPTImageEditRequestSchema: vi.fn(() => false),
}));

vi.mock('../../services/audio-api-service', () => ({
  audioAPIService: {},
  extractAudioGenerationResult: vi.fn(),
}));

vi.mock('../../services/video-analysis-service', () => ({
  DEFAULT_ANALYSIS_PROMPT: '默认视频分析',
  executeVideoAnalysis: vi.fn(),
}));

describe('generation queue knowledge context passthrough', () => {
  const refs: KnowledgeContextRef[] = [
    {
      noteId: 'note-1',
      title: '品牌设定',
      updatedAt: 123,
    },
  ];

  beforeEach(() => {
    createdTasks.length = 0;
  });

  it('keeps lightweight refs on image queue tasks', async () => {
    const { createImageTask } = await import('./image-generation');

    await createImageTask({
      prompt: '生成品牌海报',
      knowledgeContextRefs: refs,
    });

    expect(createdTasks[0]).toMatchObject({
      type: TaskType.IMAGE,
      params: {
        prompt: '生成品牌海报',
        knowledgeContextRefs: refs,
      },
    });
  });

  it('keeps lightweight refs on video queue tasks', async () => {
    const { createVideoTask } = await import('./video-generation');

    await createVideoTask({
      prompt: '生成品牌短片',
      model: 'veo3',
      knowledgeContextRefs: refs,
    });

    expect(createdTasks[0]).toMatchObject({
      type: TaskType.VIDEO,
      params: {
        prompt: '生成品牌短片',
        knowledgeContextRefs: refs,
      },
    });
  });

  it('keeps lightweight refs on audio queue tasks', async () => {
    const { generateAudio } = await import('./audio-generation');

    await generateAudio(
      {
        prompt: '生成品牌音乐',
        knowledgeContextRefs: refs,
      },
      { mode: 'queue' }
    );

    expect(createdTasks[0]).toMatchObject({
      type: TaskType.AUDIO,
      params: {
        prompt: '生成品牌音乐',
        knowledgeContextRefs: refs,
      },
    });
  });

  it('keeps refs on video prompt-start tasks without requiring a video file', async () => {
    const { videoAnalyzeTool } = await import('./video-analyze');

    await videoAnalyzeTool.execute(
      {
        prompt: '为新品生成爆款视频提示词',
        videoAnalyzerAction: 'prompt-generate',
        knowledgeContextRefs: refs,
      },
      { mode: 'queue' }
    );

    expect(createdTasks[0]).toMatchObject({
      type: TaskType.CHAT,
      params: {
        videoAnalyzerAction: 'prompt-generate',
        videoAnalyzerPrompt: '为新品生成爆款视频提示词',
        knowledgeContextRefs: refs,
      },
    });
  });
});
