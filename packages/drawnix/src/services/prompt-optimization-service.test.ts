import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KBDirectory, KBNote, KBNoteMeta } from '../types/knowledge-base.types';
import {
  buildOptimizationPrompt,
  ensurePromptOptimizationTemplates,
  getPromptOptimizationScenario,
  listPromptOptimizationScenarios,
} from './prompt-optimization-service';

const kb = vi.hoisted(() => {
  let dirSeq = 0;
  let noteSeq = 0;
  let dirs: KBDirectory[] = [];
  let notes: KBNote[] = [];

  return {
    reset: () => {
      dirSeq = 0;
      noteSeq = 0;
      dirs = [];
      notes = [];
    },
    getDirs: () => dirs,
    getNotes: () => notes,
    getAllDirectories: vi.fn(async () => dirs),
    createDirectory: vi.fn(async (name: string) => {
      const dir: KBDirectory = {
        id: `dir-${++dirSeq}`,
        name,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        order: dirs.length,
      };
      dirs = [...dirs, dir];
      return dir;
    }),
    getNotesBySourceUrl: vi.fn(async (sourceUrl: string) =>
      notes
        .filter((note) => note.metadata?.sourceUrl === sourceUrl)
        .map(({ content: _content, ...meta }) => meta as KBNoteMeta)
    ),
    getNoteById: vi.fn(async (id: string) => notes.find((note) => note.id === id) || null),
    createNote: vi.fn(
      async (
        title: string,
        directoryId: string,
        content = '',
        metadata?: KBNote['metadata']
      ) => {
        const note: KBNote = {
          id: `note-${++noteSeq}`,
          title,
          directoryId,
          content,
          metadata,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        notes = [...notes, note];
        return note;
      }
    ),
    updateNote: vi.fn(async (id: string, updates: Partial<KBNote>) => {
      notes = notes.map((note) =>
        note.id === id
          ? {
              ...note,
              ...updates,
              content: updates.content ?? note.content,
              metadata: updates.metadata ?? note.metadata,
              updatedAt: Date.now(),
            }
          : note
      );
    }),
  };
});

vi.mock('./knowledge-base-service', () => ({
  getAllDirectories: kb.getAllDirectories,
  createDirectory: kb.createDirectory,
  getNotesBySourceUrl: kb.getNotesBySourceUrl,
  getNoteById: kb.getNoteById,
  createNote: kb.createNote,
  updateNote: kb.updateNote,
}));

describe('prompt-optimization-service', () => {
  beforeEach(() => {
    kb.reset();
    vi.clearAllMocks();
  });

  it('registers all current prompt optimization scenarios', () => {
    expect(listPromptOptimizationScenarios().map((scenario) => scenario.id)).toEqual([
      'ai-input.image',
      'ai-input.video',
      'ai-input.audio',
      'ai-input.text',
      'ai-input.agent',
      'tool.image',
      'tool.video',
      'ppt.common',
      'ppt.slide',
      'music.create-song',
    ]);
  });

  it('creates the template directory and scenario note when missing', async () => {
    const content = await buildOptimizationPrompt({
      scenarioId: 'music.create-song',
      originalPrompt: '夏天海边流行歌',
      optimizationRequirements: '更适合 Suno',
      language: 'zh',
    });

    expect(kb.getDirs()[0]?.name).toBe('提示词优化');
    expect(kb.getNotes()[0]).toMatchObject({
      title: '爆款音乐-歌曲创作',
      metadata: {
        sourceUrl: 'aitu://prompt-optimization/music.create-song',
      },
    });
    expect(content).toContain('爆款歌曲定位');
    expect(content).toContain('【原始提示词】\n夏天海边流行歌');
    expect(content).toContain('【补充要求】\n更适合 Suno');
  });

  it('ensures all default scenario notes for Knowledge Base browsing', async () => {
    await ensurePromptOptimizationTemplates();

    expect(kb.getDirs()).toHaveLength(1);
    expect(kb.getDirs()[0]?.name).toBe('提示词优化');
    expect(kb.getNotes().map((note) => note.title)).toEqual([
      'AI输入-图片',
      'AI输入-视频',
      'AI输入-音频',
      'AI输入-文本',
      'AI输入-Agent',
      '工具-图片生成',
      '工具-视频生成',
      'PPT-公共提示词',
      'PPT-单页提示词',
      '爆款音乐-歌曲创作',
    ]);
    expect(kb.getNotes().map((note) => note.metadata?.sourceUrl)).toContain(
      'aitu://prompt-optimization/ai-input.agent'
    );
  });

  it('uses a non-empty user-edited note without overwriting it', async () => {
    const dir = await kb.createDirectory('提示词优化');
    await kb.createNote(
      'AI输入-图片',
      dir.id,
      '自定义模板：{{scenarioName}} / {{originalPrompt}}',
      {
        sourceUrl: 'aitu://prompt-optimization/ai-input.image',
      }
    );

    const content = await buildOptimizationPrompt({
      scenarioId: 'ai-input.image',
      originalPrompt: '一只猫',
      optimizationRequirements: '',
      language: 'zh',
    });

    expect(content).toContain('自定义模板：AI 输入框图片生成 / 一只猫');
    expect(kb.updateNote).not.toHaveBeenCalled();
  });

  it('restores an empty scenario note from the built-in template', async () => {
    const dir = await kb.createDirectory('提示词优化');
    const note = await kb.createNote('AI输入-音频', dir.id, '', {
      sourceUrl: 'aitu://prompt-optimization/ai-input.audio',
    });

    const content = await buildOptimizationPrompt({
      scenarioId: 'ai-input.audio',
      originalPrompt: '轻快背景音乐',
      optimizationRequirements: '',
      language: 'zh',
    });

    expect(kb.updateNote).toHaveBeenCalledWith(
      note.id,
      expect.objectContaining({
        content: expect.stringContaining('{{scenarioName}}'),
      })
    );
    expect(content).toContain('AI 输入框音频生成');
    expect(content).toContain('音乐风格、节奏、情绪');
  });

  it('keeps required runtime input block even when custom template omits variables', async () => {
    const dir = await kb.createDirectory('提示词优化');
    await kb.createNote('工具-视频生成', dir.id, '只写固定优化规则', {
      sourceUrl: 'aitu://prompt-optimization/tool.video',
    });

    const content = await buildOptimizationPrompt({
      scenarioId: 'tool.video',
      originalPrompt: '城市夜景延时摄影',
      optimizationRequirements: '增强镜头运动',
      language: 'zh',
    });

    expect(content).toContain('只写固定优化规则');
    expect(content).toContain('【原始提示词】\n城市夜景延时摄影');
    expect(content).toContain('【补充要求】\n增强镜头运动');
  });

  it('falls back from broad type to the matching AI input scenario', () => {
    expect(getPromptOptimizationScenario(undefined, 'agent')).toMatchObject({
      id: 'ai-input.agent',
      historyType: 'agent',
    });
  });
});
