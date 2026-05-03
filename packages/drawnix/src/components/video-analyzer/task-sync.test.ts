import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskStatus, TaskType, type Task } from '../../types/task.types';
import type { AnalysisRecord, VideoAnalysisData } from './types';
import { syncVideoAnalyzerTask } from './task-sync';

const mockStore = vi.hoisted(() => ({
  records: [] as AnalysisRecord[],
}));

vi.mock('../../utils/runtime-helpers', () => ({
  generateUUID: () => 'record-prompt',
}));

vi.mock('./storage', () => ({
  loadRecords: vi.fn(async () => mockStore.records),
  addRecord: vi.fn(async (record: AnalysisRecord) => {
    mockStore.records = [record, ...mockStore.records];
    return mockStore.records;
  }),
  updateRecord: vi.fn(async (id: string, patch: Partial<AnalysisRecord>) => {
    mockStore.records = mockStore.records.map((record) =>
      record.id === id ? { ...record, ...patch } : record
    );
    return mockStore.records;
  }),
}));

function createAnalysis(): VideoAnalysisData {
  return {
    totalDuration: 8,
    productExposureDuration: 8,
    productExposureRatio: 100,
    shotCount: 1,
    firstProductAppearance: 0,
    aspect_ratio: '9x16',
    video_style: '明亮清爽',
    bgm_mood: '轻快',
    suggestion: '先出首帧再生成视频',
    characters: [],
    shots: [
      {
        id: 'shot_1',
        startTime: 0,
        endTime: 8,
        duration: 8,
        description: '雨天门口展示防滑拖鞋',
        type: 'product',
        label: '防滑展示',
      },
    ],
  };
}

function createPromptGenerateTask(
  analysis = createAnalysis()
): Task {
  return {
    id: 'task-prompt',
    type: TaskType.CHAT,
    status: TaskStatus.COMPLETED,
    params: {
      prompt: '提示词生成：防滑拖鞋',
      model: 'gemini-3.1-pro-preview',
      videoAnalyzerAction: 'prompt-generate',
      videoAnalyzerSource: 'prompt',
      videoAnalyzerSourceLabel: '防滑拖鞋小红书爆款视频',
      videoAnalyzerUserPrompt: '防滑拖鞋小红书爆款视频',
      videoAnalyzerSourceSnapshot: {
        type: 'prompt',
        prompt: '防滑拖鞋小红书爆款视频',
        pdfCacheUrl: 'video-prompt-pdf-1.pdf',
        pdfName: '品牌资料.pdf',
        pdfMimeType: 'application/pdf',
        pdfSize: 1024,
      },
      videoAnalyzerProductInfo: {
        prompt: '防滑拖鞋小红书爆款视频',
        videoStyle: '电影感光影',
        videoModel: 'happy-horse-1.0-r2v',
        targetDuration: 30,
        segmentDuration: 5,
        creativeBrief: {
          purpose: '口播种草',
        },
      },
      pdfCacheUrl: 'video-prompt-pdf-1.pdf',
      pdfMimeType: 'application/pdf',
      pdfName: '品牌资料.pdf',
    },
    createdAt: 1,
    updatedAt: 2,
    completedAt: 3,
    result: {
      url: '',
      format: 'md',
      size: 10,
      resultKind: 'chat',
      chatResponse: '# 提示词生成结果',
      analysisData: analysis,
    },
  };
}

describe('video-analyzer task sync', () => {
  beforeEach(() => {
    mockStore.records = [];
  });

  it('syncs prompt-generated scripts into lightweight analysis records', async () => {
    const synced = await syncVideoAnalyzerTask(createPromptGenerateTask());

    expect(synced?.record).toMatchObject({
      id: 'record-prompt',
      source: 'prompt',
      sourceLabel: '防滑拖鞋小红书爆款视频',
      model: 'gemini-3.1-pro-preview',
      analyzeTaskId: 'task-prompt',
      sourceSnapshot: {
        type: 'prompt',
        prompt: '防滑拖鞋小红书爆款视频',
        pdfCacheUrl: 'video-prompt-pdf-1.pdf',
        pdfName: '品牌资料.pdf',
        pdfMimeType: 'application/pdf',
        pdfSize: 1024,
      },
      productInfo: {
        prompt: '防滑拖鞋小红书爆款视频',
        videoStyle: '电影感光影',
        videoModel: 'happy-horse-1.0-r2v',
        targetDuration: 30,
        segmentDuration: 5,
        creativeBrief: {
          purpose: '口播种草',
        },
      },
    });
    expect(synced?.record.analysis.shots[0].label).toBe('防滑展示');
    expect(JSON.stringify(synced?.record)).not.toContain('pdfData');
    expect(JSON.stringify(synced?.record)).not.toContain('base64');
  });

  it('does not create duplicate records for the same prompt task', async () => {
    const task = createPromptGenerateTask();

    await syncVideoAnalyzerTask(task);
    const syncedAgain = await syncVideoAnalyzerTask(task);

    expect(syncedAgain?.records).toHaveLength(1);
    expect(syncedAgain?.record.id).toBe('record-prompt');
  });

  it('syncs rewritten shots with characters and bgm into the record', async () => {
    const analysis = createAnalysis();
    mockStore.records = [{
      id: 'record-1',
      createdAt: 1,
      source: 'prompt',
      sourceLabel: '旧脚本',
      model: 'gemini',
      analysis,
      editedShots: analysis.shots,
      productInfo: {
        prompt: '改成原创追逐短片',
        targetDuration: 8,
        videoStyle: '旧风格',
        bgmMood: '旧 BGM',
      },
      characters: [{
        id: 'char_1',
        name: '旧角色',
        description: 'Old character',
        referenceImageUrl: 'https://example.com/ref.png',
      }],
      pendingRewriteTaskId: 'task-rewrite',
      starred: false,
    }];

    const task: Task = {
      id: 'task-rewrite',
      type: TaskType.CHAT,
      status: TaskStatus.COMPLETED,
      params: {
        prompt: '改编脚本',
        model: 'gemini',
        videoAnalyzerAction: 'rewrite',
        videoAnalyzerRecordId: 'record-1',
      },
      createdAt: 1,
      updatedAt: 2,
      completedAt: 3,
      result: {
        url: '',
        format: 'md',
        size: 10,
        resultKind: 'chat',
        chatResponse: JSON.stringify({
          video_style: '原创 3D 动画',
          bgm_mood: '紧张滑稽',
          suggestion: '第3步保持原创角色和高速堵车视觉锚点',
          characters: [{
            id: 'char_1',
            name: '原创角色',
            description: 'A small original blue traveler with a red scarf.',
          }],
          shots: [{
            ...analysis.shots[0],
            description: '原创角色遇到堵车',
            character_ids: ['char_1'],
          }],
        }),
      },
    };

    const synced = await syncVideoAnalyzerTask(task);

    expect(synced?.record.pendingRewriteTaskId).toBeNull();
    expect(synced?.record.editedShots?.[0].description).toBe('原创角色遇到堵车');
    expect(synced?.record.analysis.suggestion).toBe('第3步保持原创角色和高速堵车视觉锚点');
    expect(synced?.record.characters).toEqual([{
      id: 'char_1',
      name: '原创角色',
      description: 'A small original blue traveler with a red scarf.',
      referenceImageUrl: 'https://example.com/ref.png',
    }]);
    expect(synced?.record.productInfo).toMatchObject({
      videoStyle: '原创 3D 动画',
      bgmMood: '紧张滑稽',
    });
    expect(synced?.record.scriptVersions?.[0]).toMatchObject({
      label: 'AI 改编 #1',
      characters: synced?.record.characters,
      productInfo: expect.objectContaining({
        bgmMood: '紧张滑稽',
      }),
    });
  });

  it('syncs structured rewrite analysis data with characters and style', async () => {
    const analysis = createAnalysis();
    mockStore.records = [{
      id: 'record-1',
      createdAt: 1,
      source: 'prompt',
      sourceLabel: '旧脚本',
      model: 'gemini',
      analysis,
      editedShots: analysis.shots,
      productInfo: {
        prompt: '改成原创追逐短片',
        targetDuration: 8,
      },
      pendingRewriteTaskId: 'task-rewrite',
      starred: false,
    }];

    const task: Task = {
      id: 'task-rewrite',
      type: TaskType.CHAT,
      status: TaskStatus.COMPLETED,
      params: {
        prompt: '改编脚本',
        model: 'gemini',
        videoAnalyzerAction: 'rewrite',
        videoAnalyzerRecordId: 'record-1',
      },
      createdAt: 1,
      updatedAt: 2,
      completedAt: 3,
      result: {
        url: '',
        format: 'md',
        size: 10,
        resultKind: 'chat',
        chatResponse: '模型原文',
        analysisData: {
          editedShots: [{
            ...analysis.shots[0],
            description: '结构化改编镜头',
            character_ids: ['char_1'],
          }],
          characters: [{
            id: 'char_1',
            name: '笨笨',
            description: 'A chubby original creature.',
          }],
          video_style: '友好3D动画风格',
          bgm_mood: '轻快滑稽',
        },
      },
    };

    const synced = await syncVideoAnalyzerTask(task);

    expect(synced?.record.editedShots?.[0].description).toBe('结构化改编镜头');
    expect(synced?.record.analysis.suggestion).toBe('');
    expect(synced?.record.characters?.[0].name).toBe('笨笨');
    expect(synced?.record.productInfo).toMatchObject({
      videoStyle: '友好3D动画风格',
      bgmMood: '轻快滑稽',
    });
  });

  it('returns the already-synced rewrite record when another listener consumed the task first', async () => {
    const analysis = createAnalysis();
    mockStore.records = [{
      id: 'record-1',
      createdAt: 1,
      source: 'prompt',
      sourceLabel: '已同步脚本',
      model: 'gemini',
      analysis,
      editedShots: [{
        ...analysis.shots[0],
        description: '已同步的新脚本',
      }],
      productInfo: {
        prompt: '改成原创追逐短片',
        targetDuration: 8,
      },
      pendingRewriteTaskId: null,
      storyboardGeneratedAt: 5,
      starred: false,
    }];

    const task: Task = {
      id: 'task-rewrite',
      type: TaskType.CHAT,
      status: TaskStatus.COMPLETED,
      params: {
        prompt: '改编脚本',
        model: 'gemini',
        videoAnalyzerAction: 'rewrite',
        videoAnalyzerRecordId: 'record-1',
      },
      createdAt: 1,
      updatedAt: 2,
      completedAt: 3,
      result: {
        url: '',
        format: 'md',
        size: 10,
        resultKind: 'chat',
        chatResponse: '{}',
      },
    };

    const synced = await syncVideoAnalyzerTask(task);

    expect(synced?.record.editedShots?.[0].description).toBe('已同步的新脚本');
  });
});
