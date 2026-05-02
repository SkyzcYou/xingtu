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
});
