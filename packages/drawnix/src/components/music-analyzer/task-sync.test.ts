import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MusicAnalysisRecord } from './types';
import { syncMusicAnalyzerTask } from './task-sync';
import { TaskStatus, TaskType, type Task } from '../../types/task.types';

const { recordsStore, loadRecordsMock, updateRecordMock, addRecordMock } =
  vi.hoisted(() => ({
    recordsStore: { records: [] as MusicAnalysisRecord[] },
    loadRecordsMock: vi.fn(),
    updateRecordMock: vi.fn(),
    addRecordMock: vi.fn(),
  }));

vi.hoisted(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) || null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
  });
});

vi.mock('./storage', () => ({
  loadRecords: loadRecordsMock,
  updateRecord: updateRecordMock,
  addRecord: addRecordMock,
}));

describe('music-analyzer task sync', () => {
  beforeEach(() => {
    recordsStore.records = [];
    loadRecordsMock.mockReset();
    updateRecordMock.mockReset();
    addRecordMock.mockReset();
    loadRecordsMock.mockImplementation(async () => recordsStore.records);
    updateRecordMock.mockImplementation(
      async (id: string, patch: Partial<MusicAnalysisRecord>) => {
        recordsStore.records = recordsStore.records.map((record) =>
          record.id === id ? { ...record, ...patch } : record
        );
        return recordsStore.records;
      }
    );
  });

  it('merges music brief style tags when syncing Suno lyrics results', async () => {
    recordsStore.records = [
      {
        id: 'record-1',
        createdAt: 1,
        source: 'scratch',
        sourceLabel: '热血新歌',
        creationPrompt: '写一首冲破低谷的歌',
        pendingLyricsGenTaskId: 'task-1',
        musicBrief: {
          genreStyle: 'EDM Pop',
          vocalStyle: 'female vocal',
          energyMood: '高能上扬',
        },
        styleTags: ['old tag'],
        starred: false,
      },
    ];

    const task = {
      id: 'task-1',
      type: TaskType.AUDIO,
      status: TaskStatus.COMPLETED,
      params: {
        prompt: 'lyrics prompt',
        musicAnalyzerAction: 'lyrics-gen',
        musicAnalyzerRecordId: 'record-1',
      },
      createdAt: 1,
      updatedAt: 1,
      result: {
        url: '',
        format: 'lyrics',
        size: 0,
        resultKind: 'lyrics',
        lyricsTitle: '燃夜',
        lyricsTags: ['dance pop', 'female vocal'],
        lyricsText: '[Chorus]\n把黑夜点燃',
      },
    } satisfies Task;

    const synced = await syncMusicAnalyzerTask(task);

    expect(synced?.record.title).toBe('燃夜');
    expect(synced?.record.styleTags).toEqual([
      'dance pop',
      'female vocal',
      'EDM Pop',
      '高能上扬',
    ]);
    expect(synced?.record.lyricsDraft).toBe('[Chorus]\n把黑夜点燃');
    expect(synced?.record.pendingLyricsGenTaskId).toBeNull();
    expect(synced?.record.lyricsVersions?.[0]).toMatchObject({
      label: 'Suno 歌词',
      title: '燃夜',
      styleTags: ['dance pop', 'female vocal', 'EDM Pop', '高能上扬'],
    });
  });
});
