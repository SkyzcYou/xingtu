import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskStatus, TaskType } from '../../types/task.types';
import type { Task } from '../../types/task.types';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function flushAsyncWork(turns = 6): Promise<void> {
  for (let index = 0; index < turns; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function setupTaskQueueServiceHarness(statusSequence: TaskStatus[]) {
  const storedTasks = new Map<string, any>();

  const mocks = {
    saveTask: vi.fn(async (task: any) => {
      storedTasks.set(task.id, clone(task));
    }),
    getStoredTask: vi.fn(async (taskId: string) => {
      const task = storedTasks.get(taskId);
      return task ? clone(task) : null;
    }),
    deleteTask: vi.fn(async (taskId: string) => {
      storedTasks.delete(taskId);
    }),
    archiveTasks: vi.fn(async () => {}),
    invalidateCache: vi.fn(),
    generateImage: vi.fn(async () => undefined),
  };

  const waitForTaskCompletion = vi.fn(async (taskId: string, options?: any) => {
    const currentTask = storedTasks.get(taskId);
    if (!currentTask) {
      return { success: false, error: 'missing-task' };
    }

    const callIndex = waitForTaskCompletion.mock.calls.length - 1;
    const nextStatus =
      statusSequence[callIndex] || statusSequence[statusSequence.length - 1];
    const now = Date.now();
    const updatedTask =
      nextStatus === TaskStatus.COMPLETED
        ? {
            ...clone(currentTask),
            status: TaskStatus.COMPLETED,
            updatedAt: now,
            completedAt: now,
            progress: 100,
            result: {
              url: 'https://example.com/out.png',
              format: 'png',
              size: 1,
            },
          }
        : {
            ...clone(currentTask),
            status: TaskStatus.FAILED,
            updatedAt: now,
            completedAt: now,
            error: {
              code: 'EXECUTION_ERROR',
              message: 'Image generation failed',
            },
          };

    storedTasks.set(taskId, clone(updatedTask));
    options?.onProgress?.(clone(updatedTask));

    return nextStatus === TaskStatus.COMPLETED
      ? { success: true, task: clone(updatedTask) }
      : {
          success: false,
          task: clone(updatedTask),
          error: updatedTask.error?.message || 'failed',
        };
  });

  vi.doMock('../media-executor/task-storage-writer', () => ({
    taskStorageWriter: {
      saveTask: mocks.saveTask,
      getTask: mocks.getStoredTask,
      deleteTask: mocks.deleteTask,
      archiveTasks: mocks.archiveTasks,
    },
  }));

  vi.doMock('../task-storage-reader', () => ({
    taskStorageReader: {
      invalidateCache: mocks.invalidateCache,
      getTask: vi.fn(async (taskId: string) => {
        const task = storedTasks.get(taskId);
        return task ? clone(task) : null;
      }),
      getAllTasks: vi.fn(async () => []),
    },
  }));

  vi.doMock('../media-executor', () => ({
    executorFactory: {
      getExecutor: vi.fn(async () => ({
        generateImage: mocks.generateImage,
      })),
    },
    waitForTaskCompletion,
  }));

  vi.doMock('../../utils/settings-manager', () => ({
    hasInvocationRouteCredentials: vi.fn(() => true),
    providerPricingCacheSettings: {
      get: vi.fn(() => []),
      set: vi.fn(),
    },
  }));

  vi.doMock('../../utils/posthog-analytics', () => ({
    analytics: {
      track: vi.fn(),
      trackModelCall: vi.fn(),
      trackModelSuccess: vi.fn(),
      trackModelFailure: vi.fn(),
      trackTaskCancellation: vi.fn(),
    },
  }));

  vi.doMock('../model-adapters', () => ({
    getAdapterContextFromSettings: vi.fn(),
    resolveAdapterForInvocation: vi.fn(),
  }));

  vi.doMock('../unified-cache-service', () => ({
    unifiedCacheService: {
      getImageForAI: vi.fn(),
      isCached: vi.fn(async () => false),
      cacheMediaFromBlob: vi.fn(async () => {}),
    },
  }));

  vi.doMock('../analysis-core', () => ({
    buildGenerateContentConfig: vi.fn(() => ({})),
  }));

  vi.doMock('../video-analysis-service', () => ({
    executeVideoAnalysis: vi.fn(),
  }));

  vi.doMock('../music-analysis-service', () => ({
    DEFAULT_MUSIC_ANALYSIS_PROMPT: 'default',
    executeMusicAnalysis: vi.fn(),
    MAX_AUDIO_ANALYZE_FILE_SIZE: 1024,
  }));

  vi.doMock('../../utils/gemini-api/services', () => ({
    sendChatWithGemini: vi.fn(),
  }));

  vi.doMock('../../utils/gemini-api/message-utils', () => ({
    buildInlineDataPart: vi.fn(),
  }));

  vi.doMock('../../utils/gemini-api/logged-calls', () => ({
    callGoogleGenerateContentWithLog: vi.fn(),
  }));

  vi.doMock('../../components/video-analyzer/storage', () => ({
    loadRecords: vi.fn(async () => []),
  }));

  vi.doMock('../../components/video-analyzer/utils', () => ({
    applyRewriteShotUpdates: vi.fn(),
    parseRewriteShotUpdates: vi.fn(),
  }));

  vi.doMock('../../components/music-analyzer/storage', () => ({
    loadRecords: vi.fn(async () => []),
  }));

  vi.doMock('../../components/music-analyzer/utils', () => ({
    parseLyricsRewriteResult: vi.fn(),
  }));

  vi.doMock('../../utils/task-utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../utils/task-utils')>();

    return {
      ...actual,
      generateTaskId: () => 'task-image-edit-1',
    };
  });

  const { taskQueueService } = await import('../task-queue-service');

  return {
    taskQueueService,
    storedTasks,
    mocks: {
      ...mocks,
      waitForTaskCompletion,
    },
  };
}

describe('task-queue-service image edit retry persistence', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('keeps stripped image edit params in IndexedDB so retry can rehydrate them', async () => {
    const { taskQueueService, storedTasks, mocks } =
      await setupTaskQueueServiceHarness([
        TaskStatus.FAILED,
        TaskStatus.COMPLETED,
      ]);

    const task = taskQueueService.createTask(
      {
        prompt: 'Edit this image',
        model: 'gpt-image-2',
        size: '1x1',
        generationMode: 'image_to_image',
        referenceImages: ['data:image/png;base64,source'],
        maskImage: 'data:image/png;base64,mask',
        outputFormat: 'png',
      },
      TaskType.IMAGE
    );

    await flushAsyncWork();

    expect(mocks.generateImage).toHaveBeenCalledTimes(1);
    expect(
      taskQueueService.getTask(task.id)?.params.referenceImages
    ).toBeUndefined();
    expect(storedTasks.get(task.id)?.params.referenceImages).toEqual([
      'data:image/png;base64,source',
    ]);

    taskQueueService.retryTask(task.id);
    await flushAsyncWork();

    expect(mocks.generateImage).toHaveBeenCalledTimes(2);
    expect(mocks.generateImage.mock.calls[1]?.[0]).toMatchObject({
      generationMode: 'image_to_image',
      referenceImages: ['data:image/png;base64,source'],
      maskImage: 'data:image/png;base64,mask',
      outputFormat: 'png',
    });
    expect(storedTasks.get(task.id)?.params.referenceImages).toEqual([
      'data:image/png;base64,source',
    ]);
  });

  it('rehydrates stripped edit params after restoreTasks before retry execution', async () => {
    const { taskQueueService, storedTasks, mocks } =
      await setupTaskQueueServiceHarness([TaskStatus.COMPLETED]);

    const restoredTask: Task = {
      id: 'task-image-edit-1',
      type: TaskType.IMAGE,
      status: TaskStatus.FAILED,
      params: {
        prompt: 'Retry restored edit',
        model: 'gpt-image-2',
        size: '1x1',
        generationMode: 'image_to_image',
        referenceImages: ['data:image/png;base64,restored-source'],
        maskImage: 'data:image/png;base64,restored-mask',
      },
      createdAt: 1,
      updatedAt: 1,
      error: {
        code: 'EXECUTION_ERROR',
        message: 'Image generation failed',
      },
    };

    storedTasks.set(restoredTask.id, clone(restoredTask));

    taskQueueService.restoreTasks([clone(restoredTask)]);

    expect(
      taskQueueService.getTask(restoredTask.id)?.params.referenceImages
    ).toBeUndefined();

    taskQueueService.retryTask(restoredTask.id);
    await flushAsyncWork();

    expect(mocks.generateImage).toHaveBeenCalledTimes(1);
    expect(mocks.generateImage.mock.calls[0]?.[0]).toMatchObject({
      generationMode: 'image_to_image',
      referenceImages: ['data:image/png;base64,restored-source'],
      maskImage: 'data:image/png;base64,restored-mask',
    });
  });
});
