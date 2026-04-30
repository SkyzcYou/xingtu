import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskStatus, TaskType, type Task } from '../../types/task.types';
import type { ComicRecord } from './types';
import { syncComicOutlineTask, syncComicPageImageTask } from './task-sync';

const mockStore = vi.hoisted(() => ({
  records: [] as ComicRecord[],
}));

vi.mock('./storage', () => ({
  loadRecords: vi.fn(async () => mockStore.records),
  updateRecord: vi.fn(async (id: string, patch: Partial<ComicRecord>) => {
    mockStore.records = mockStore.records.map((record) =>
      record.id === id ? { ...record, ...patch } : record
    );
    return mockStore.records;
  }),
}));

function createRecord(): ComicRecord {
  return {
    id: 'comic-1',
    starred: false,
    title: '旧标题',
    sourcePrompt: '节水故事',
    commonPrompt: '旧公共提示词',
    pageCount: 2,
    pages: [
      {
        id: 'page-01',
        pageNumber: 1,
        title: '旧页',
        script: '旧脚本',
        prompt: '旧提示词',
        status: 'draft',
      },
      {
        id: 'page-02',
        pageNumber: 2,
        title: '旧第 2 页',
        script: '旧第 2 页脚本',
        prompt: '旧第 2 页提示词',
        status: 'draft',
      },
    ],
    pendingOutlineTaskId: 'task-outline',
    createdAt: 1,
    updatedAt: 2,
  };
}

function createTask(params: Partial<Task>): Task {
  return {
    id: 'task-outline',
    type: TaskType.CHAT,
    status: TaskStatus.COMPLETED,
    params: {
      prompt: 'prompt',
      comicCreatorAction: 'outline',
      comicCreatorRecordId: 'comic-1',
      comicCreatorPageCount: 2,
    },
    createdAt: 1,
    updatedAt: 2,
    ...params,
  } as Task;
}

describe('comic task sync', () => {
  beforeEach(() => {
    mockStore.records = [createRecord()];
  });

  it('syncs outline task into pages', async () => {
    const task = createTask({
      result: {
        url: '',
        format: 'json',
        size: 0,
        chatResponse: JSON.stringify({
          title: '水滴旅行',
          commonPrompt: '统一水滴角色',
          pages: [
            { title: '出发', script: '水滴醒来', prompt: '清晨水滴' },
            { title: '云上', script: '飞到云里', prompt: '云层' },
          ],
        }),
      },
    });

    const synced = await syncComicOutlineTask(task);

    expect(synced?.record.title).toBe('水滴旅行');
    expect(synced?.record.commonPrompt).toBe('统一水滴角色');
    expect(synced?.record.pendingOutlineTaskId).toBeNull();
    expect(synced?.record.pages[0]).toMatchObject({
      id: 'page-01',
      title: '出发',
      prompt: '清晨水滴',
    });
    expect(synced?.record.pages[1]).toMatchObject({
      id: 'page-02',
      title: '云上',
      prompt: '云层',
    });
  });

  it('keeps old pages when outline JSON is invalid', async () => {
    const task = createTask({
      result: {
        url: '',
        format: 'json',
        size: 0,
        chatResponse: '不是 JSON',
      },
    });

    const synced = await syncComicOutlineTask(task);

    expect(synced?.record.outlineError).toBeTruthy();
    expect(synced?.record.pages[0].title).toBe('旧页');
    expect(synced?.record.pendingOutlineTaskId).toBeNull();
  });

  it('syncs image task result back to the target page only', async () => {
    mockStore.records = [
      {
        ...createRecord(),
        pendingOutlineTaskId: null,
        pages: createRecord().pages.map((page, index) => ({
          ...page,
          taskId: index === 0 ? 'task-image' : null,
        })),
      },
    ];
    const task = createTask({
      id: 'task-image',
      type: TaskType.IMAGE,
      params: {
        prompt: 'image prompt',
        comicCreatorAction: 'page-image',
        comicCreatorRecordId: 'comic-1',
        comicCreatorPageId: 'page-01',
      },
      result: {
        url: 'https://cdn.example.com/page-01.png',
        format: 'png',
        size: 1024,
      },
      completedAt: 10,
    });

    const synced = await syncComicPageImageTask(task);

    expect(synced?.record.pages[0]).toMatchObject({
      status: 'succeeded',
      imageUrl: 'https://cdn.example.com/page-01.png',
      imageMimeType: 'image/png',
      imageGeneratedAt: 10,
    });
    expect(synced?.record.pages[0].imageVariants).toEqual([
      {
        id: 'task-image',
        url: 'https://cdn.example.com/page-01.png',
        mimeType: 'image/png',
        generatedAt: 10,
        taskId: 'task-image',
      },
    ]);
    expect(synced?.record.pages[1].imageUrl).toBeUndefined();
  });

  it('syncs one task from a multi-image page task list', async () => {
    mockStore.records = [
      {
        ...createRecord(),
        pendingOutlineTaskId: null,
        pages: createRecord().pages.map((page, index) => ({
          ...page,
          taskId: index === 0 ? 'task-image-1' : null,
          taskIds: index === 0 ? ['task-image-1', 'task-image-2'] : null,
          imageUrl: index === 0 ? 'https://cdn.example.com/old.png' : undefined,
          imageVariants:
            index === 0
              ? [
                  {
                    id: 'old',
                    url: 'https://cdn.example.com/old.png',
                  },
                ]
              : undefined,
        })),
      },
    ];
    const task = createTask({
      id: 'task-image-2',
      type: TaskType.IMAGE,
      params: {
        prompt: 'image prompt',
        comicCreatorAction: 'page-image',
        comicCreatorRecordId: 'comic-1',
        comicCreatorPageId: 'page-01',
      },
      result: {
        url: 'https://cdn.example.com/page-02.png',
        format: 'png',
        size: 1024,
      },
      completedAt: 20,
    });

    const synced = await syncComicPageImageTask(task);

    expect(synced?.record.pages[0].imageUrl).toBe(
      'https://cdn.example.com/page-02.png'
    );
    expect(
      synced?.record.pages[0].imageVariants?.map((variant) => variant.url)
    ).toEqual([
      'https://cdn.example.com/old.png',
      'https://cdn.example.com/page-02.png',
    ]);
  });
});
