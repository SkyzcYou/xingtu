import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskStatus, TaskType, type Task } from '../../types/task.types';
import type { MVRecord, VideoShot } from './types';
import { syncMVRewriteTask, syncMVStoryboardTask } from './task-sync';

const mockStore = vi.hoisted(() => ({
  records: [] as MVRecord[],
}));

vi.mock('./storage', () => ({
  loadRecords: vi.fn(async () => mockStore.records),
  updateRecord: vi.fn(async (id: string, patch: Partial<MVRecord>) => {
    mockStore.records = mockStore.records.map((record) =>
      record.id === id ? { ...record, ...patch } : record
    );
    return mockStore.records;
  }),
}));

const shot: VideoShot = {
  id: 'shot_1',
  startTime: 0,
  endTime: 8,
  duration: 8,
  description: '旧分镜',
  narration: '',
  type: 'opening',
  label: '开场',
  character_ids: ['char_1'],
};

describe('mv-creator task sync', () => {
  beforeEach(() => {
    mockStore.records = [];
  });

  it('syncs storyboard JSON after model thinking text', async () => {
    mockStore.records = [{
      id: 'mv_storyboard_1',
      createdAt: 1,
      sourceLabel: 'source',
      starred: false,
      pendingStoryboardTaskId: 'task-storyboard',
      videoStyle: '电影感',
      characters: [],
    }];

    const task: Task = {
      id: 'task-storyboard',
      type: TaskType.CHAT,
      status: TaskStatus.COMPLETED,
      params: {
        prompt: '生成原创 MV 分镜',
        model: 'gemini',
        mvCreatorAction: 'storyboard',
        mvCreatorRecordId: 'mv_storyboard_1',
      },
      createdAt: 1,
      updatedAt: 2,
      completedAt: 3,
      result: {
        url: '',
        format: 'md',
        size: 10,
        resultKind: 'chat',
        chatResponse: `<think>{"shots":"draft"}</think>
说明：
${JSON.stringify({
          characters: [{
            id: 'char_1',
            name: '主唱',
            description: 'Original singer with silver jacket',
          }],
          shots: [{
            id: '',
            startTime: 0,
            endTime: 5,
            duration: 5,
            description: '原创舞台开场',
            type: 'opening',
            label: '开场',
          }],
        })}`,
      },
    };

    const synced = await syncMVStoryboardTask(task);

    expect(synced?.record.characters?.[0].id).toBe('char_1');
    expect(synced?.record.editedShots?.[0]).toMatchObject({
      id: 'shot_1',
      description: '原创舞台开场',
    });
  });

  it('syncs rewrite characters even when the AI clears them', async () => {
    mockStore.records = [{
      id: 'mv_1',
      createdAt: 1,
      sourceLabel: 'source',
      starred: false,
      pendingRewriteTaskId: 'task-rewrite',
      editedShots: [shot],
      videoStyle: '旧风格',
      characters: [{
        id: 'char_1',
        name: '旧角色',
        description: 'Old character',
        referenceImageUrl: 'https://example.com/ref.png',
      }],
    }];

    const task: Task = {
      id: 'task-rewrite',
      type: TaskType.CHAT,
      status: TaskStatus.COMPLETED,
      params: {
        prompt: '改成无角色抽象 MV',
        model: 'gemini',
        mvCreatorAction: 'rewrite',
        mvCreatorRecordId: 'mv_1',
      },
      createdAt: 1,
      updatedAt: 2,
      completedAt: 3,
      result: {
        url: '',
        format: 'md',
        size: 10,
        resultKind: 'chat',
        chatResponse: `<think>**Considering c** {"draft": true, "shots": "not array"}</think>
${JSON.stringify({
          video_style: '抽象霓虹光影',
          characters: [],
          shots: [{
            ...shot,
            description: '无角色抽象光影随音乐律动',
            character_ids: [],
          }],
        })}`,
      },
    };

    const synced = await syncMVRewriteTask(task);

    expect(synced?.record.characters).toEqual([]);
    expect(synced?.record.videoStyle).toBe('抽象霓虹光影');
    expect(synced?.record.editedShots?.[0]).toMatchObject({
      description: '无角色抽象光影随音乐律动',
      character_ids: [],
    });
    expect(synced?.record.storyboardVersions?.[0]).toMatchObject({
      characters: [],
      videoStyle: '抽象霓虹光影',
    });
  });

  it('syncs rewrite JSON from chat completion envelopes', async () => {
    mockStore.records = [{
      id: 'mv_1',
      createdAt: 1,
      sourceLabel: 'source',
      starred: false,
      pendingRewriteTaskId: 'task-rewrite',
      editedShots: [shot],
      videoStyle: '旧风格',
      characters: [],
    }];

    const task: Task = {
      id: 'task-rewrite',
      type: TaskType.CHAT,
      status: TaskStatus.COMPLETED,
      params: {
        prompt: '改成原创公路追逐',
        model: 'gpt-5.4',
        mvCreatorAction: 'rewrite',
        mvCreatorRecordId: 'mv_1',
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
          id: 'chatcmpl-test',
          object: 'chat.completion',
          choices: [{
            message: {
              role: 'assistant',
              content: JSON.stringify({
                video_style: '友好3D动画风格',
                characters: [{
                  id: 'char_1',
                  name: '团团熊',
                  description: 'A chubby original cartoon bear.',
                }],
                shots: [{
                  ...shot,
                  description: '五一高速入口前大堵车，原创角色追逐开场',
                  character_ids: ['char_1'],
                }],
              }),
            },
          }],
        }),
      },
    };

    const synced = await syncMVRewriteTask(task);

    expect(synced?.record.videoStyle).toBe('友好3D动画风格');
    expect(synced?.record.characters?.[0].name).toBe('团团熊');
    expect(synced?.record.editedShots?.[0].description).toBe('五一高速入口前大堵车，原创角色追逐开场');
  });

  it('returns the already-synced rewrite record when another listener consumed the task first', async () => {
    mockStore.records = [{
      id: 'mv_1',
      createdAt: 1,
      sourceLabel: 'source',
      starred: false,
      pendingRewriteTaskId: null,
      editedShots: [{
        ...shot,
        description: '已同步 MV 分镜',
      }],
      storyboardGeneratedAt: 5,
    }];

    const task: Task = {
      id: 'task-rewrite',
      type: TaskType.CHAT,
      status: TaskStatus.COMPLETED,
      params: {
        prompt: '改编脚本',
        model: 'gemini',
        mvCreatorAction: 'rewrite',
        mvCreatorRecordId: 'mv_1',
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

    const synced = await syncMVRewriteTask(task);

    expect(synced?.record.editedShots?.[0].description).toBe('已同步 MV 分镜');
  });
});
