import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appendKnowledgeContextToPrompt,
  buildPromptWithKnowledgeContext,
  MAX_KNOWLEDGE_CONTEXT_CHARS_PER_NOTE,
  MAX_KNOWLEDGE_CONTEXT_CHARS_TOTAL,
  normalizeGenerationParamsKnowledgeContext,
  normalizeKnowledgeContextRefs,
  stripKnowledgeContextFromPrompt,
} from './generation-context-service';

const notes = new Map<string, any>();

vi.mock('./knowledge-base-service', () => ({
  knowledgeBaseService: {
    getNoteById: vi.fn((id: string) => {
      const value = notes.get(id);
      if (value instanceof Error) {
        return Promise.reject(value);
      }
      return Promise.resolve(value || null);
    }),
  },
}));

describe('generation-context-service', () => {
  beforeEach(() => {
    notes.clear();
  });

  it('dedupes and caps lightweight note refs', () => {
    const refs = normalizeKnowledgeContextRefs(
      [
        { noteId: 'a', title: 'A' },
        { noteId: 'a', title: 'A again' },
        { noteId: 'b', title: 'B' },
      ],
      1
    );

    expect(refs).toEqual([{ noteId: 'a', title: 'A' }]);
  });

  it('builds prompt with existing non-empty notes and skips invalid refs', async () => {
    notes.set('a', {
      id: 'a',
      title: '产品定位',
      directoryId: 'dir',
      updatedAt: 100,
      content: '核心卖点是轻便防滑。',
      metadata: { tags: ['产品'], domain: 'example.com' },
    });
    notes.set('empty', {
      id: 'empty',
      title: '空笔记',
      directoryId: 'dir',
      updatedAt: 101,
      content: '   ',
    });

    const result = await buildPromptWithKnowledgeContext('生成一条视频', [
      { noteId: 'a', title: '产品定位', updatedAt: 100 },
      { noteId: 'missing', title: '已删除' },
      { noteId: 'empty', title: '空笔记' },
    ]);

    expect(result.prompt).toContain('生成一条视频');
    expect(result.prompt).toContain('【参考知识库笔记】');
    expect(result.prompt).toContain('核心卖点是轻便防滑');
    expect(result.includedRefs).toHaveLength(1);
    expect(result.skippedRefs.map((item) => item.reason)).toEqual([
      'missing',
      'empty',
    ]);
  });

  it('appends context after the original prompt', () => {
    expect(appendKnowledgeContextToPrompt('原始提示', '上下文')).toBe(
      '原始提示\n\n---\n上下文'
    );
  });

  it('drops appended knowledge context when it would exceed prompt budget', async () => {
    const basePrompt = '核心视频提示'.repeat(260);
    const ref = { noteId: 'a', title: '产品定位' };
    notes.set('a', {
      id: 'a',
      title: '产品定位',
      directoryId: 'dir',
      updatedAt: 100,
      content: '补充上下文'.repeat(600),
    });

    const result = await buildPromptWithKnowledgeContext(basePrompt, [ref], {
      maxPromptLength: 2500,
    });

    expect(result.prompt).toBe(basePrompt);
    expect(result.contextBlock).toBe('');
    expect(result.includedRefs).toEqual([]);
    expect(result.skippedRefs).toContainEqual({
      ref: expect.objectContaining(ref),
      reason: 'limit',
    });
  });

  it('strips appended knowledge context before prompt history storage', () => {
    expect(
      stripKnowledgeContextFromPrompt(
        '原始提示\n\n---\n【参考知识库笔记】\n完整笔记正文'
      )
    ).toBe('原始提示');
    expect(
      stripKnowledgeContextFromPrompt('【参考知识库笔记】\n完整笔记正文')
    ).toBe('');
  });

  it('normalizes task params with original prompt lineage and lightweight refs', () => {
    const normalized = normalizeGenerationParamsKnowledgeContext({
      prompt: '原始提示\n\n---\n【参考知识库笔记】\n完整笔记正文',
      knowledgeContextRefs: [
        {
          noteId: 'note-1',
          title: '产品定位',
          directoryId: 'dir-1',
          updatedAt: 2,
        },
      ],
    });

    expect(normalized.prompt).toBe('原始提示');
    expect(normalized.promptMeta).toMatchObject({
      initialPrompt: '原始提示',
      sentPrompt: '原始提示',
      knowledgeContextRefs: [
        {
          noteId: 'note-1',
          title: '产品定位',
          directoryId: 'dir-1',
          updatedAt: 2,
        },
      ],
    });
  });

  it('truncates each note and total context without duplicating full bodies', async () => {
    const longContent = '设定'.repeat(MAX_KNOWLEDGE_CONTEXT_CHARS_PER_NOTE * 2);
    for (let i = 0; i < 10; i += 1) {
      notes.set(`note-${i}`, {
        id: `note-${i}`,
        title: `长笔记 ${i}`,
        directoryId: 'dir',
        updatedAt: 100 + i,
        content: longContent,
      });
    }

    const result = await buildPromptWithKnowledgeContext(
      '生成图片',
      Array.from({ length: 10 }, (_, index) => ({
        noteId: `note-${index}`,
        title: `长笔记 ${index}`,
      }))
    );
    const contextBody = result.contextBlock.split('\n\n').slice(2).join('\n\n');

    expect(contextBody.length).toBeLessThanOrEqual(
      MAX_KNOWLEDGE_CONTEXT_CHARS_TOTAL +
        '\n\n---\n\n'.length * (result.includedRefs.length - 1)
    );
    expect(result.contextBlock).toContain('...');
    expect(result.contextBlock.length).toBeLessThan(longContent.length * 2);
  });

  it('treats note read failures as missing and keeps generation usable', async () => {
    notes.set('broken', new Error('indexeddb unavailable'));

    const result = await buildPromptWithKnowledgeContext('生成音乐', [
      { noteId: 'broken', title: '读取失败' },
    ]);

    expect(result.prompt).toBe('生成音乐');
    expect(result.includedRefs).toEqual([]);
    expect(result.skippedRefs).toEqual([
      {
        ref: { noteId: 'broken', title: '读取失败' },
        reason: 'missing',
      },
    ]);
  });
});
