import { describe, expect, it } from 'vitest';
import type { KBDirectory, KBNoteMeta } from '../../types/knowledge-base.types';
import {
  filterKnowledgeNoteMetas,
  getKnowledgeNoteContextCompactState,
  isKnowledgeNoteOptionDisabled,
  normalizeKnowledgeNoteSearch,
} from './KnowledgeNoteContextSelector';

const directories: KBDirectory[] = [
  {
    id: 'dir-1',
    name: '项目笔记',
    isDefault: true,
    createdAt: 1,
    updatedAt: 1,
    order: 0,
  },
];

const notes: KBNoteMeta[] = [
  {
    id: 'note-1',
    title: '产品定位',
    directoryId: 'dir-1',
    createdAt: 1,
    updatedAt: 2,
    metadata: { description: '卖点', tags: ['品牌'] },
  },
  {
    id: 'note-2',
    title: '拍摄脚本',
    directoryId: 'dir-1',
    createdAt: 1,
    updatedAt: 3,
    metadata: { domain: 'example.com' },
  },
];

describe('KnowledgeNoteContextSelector logic', () => {
  it('normalizes search text for compact matching', () => {
    expect(normalizeKnowledgeNoteSearch('  品 牌 Brief  ')).toBe('品牌brief');
  });

  it('filters by title, metadata and directory name', () => {
    expect(filterKnowledgeNoteMetas(notes, directories, '脚本')).toEqual([
      notes[1],
    ]);
    expect(filterKnowledgeNoteMetas(notes, directories, '品牌')).toEqual([
      notes[0],
    ]);
    expect(filterKnowledgeNoteMetas(notes, directories, '项目笔记')).toEqual(
      notes
    );
  });

  it('returns an empty list for empty knowledge base or unmatched query', () => {
    expect(filterKnowledgeNoteMetas([], directories, '')).toEqual([]);
    expect(filterKnowledgeNoteMetas(notes, directories, '不存在')).toEqual([]);
  });

  it('disables only new options after reaching max selection', () => {
    expect(isKnowledgeNoteOptionDisabled('note-2', ['note-1'], 1)).toBe(true);
    expect(isKnowledgeNoteOptionDisabled('note-1', ['note-1'], 1)).toBe(false);
    expect(isKnowledgeNoteOptionDisabled('note-2', ['note-1'], 2)).toBe(false);
  });

  it('renders compact mode without visible selected chips and keeps hover titles', () => {
    const state = getKnowledgeNoteContextCompactState(
      [
        {
          noteId: 'note-1',
          title: '产品定位',
          directoryId: 'dir-1',
          updatedAt: 2,
        },
      ],
      'zh'
    );

    expect(state.triggerLabel).toBe('知识库上下文，已选 1 篇笔记');
    expect(state.shouldShowChips).toBe(false);
    expect(state.canClear).toBe(true);
    expect(state.clearLabel).toBe('清除');
    expect(state.clearAriaLabel).toBe('清除已选知识库笔记');
    expect(state.addNoteLabel).toBe('添加笔记');
    expect(state.addNoteAriaLabel).toBe('打开知识库新建笔记');
    expect(state.badgeText).toBe('1');
    expect(state.hoverTitle).toBe('已选知识库笔记');
    expect(state.noteTitles).toEqual(['产品定位']);
  });

  it('does not expose compact clear action when no notes are selected', () => {
    const state = getKnowledgeNoteContextCompactState([], 'en');

    expect(state.triggerLabel).toBe('Select knowledge notes');
    expect(state.canClear).toBe(false);
    expect(state.clearLabel).toBe('Clear');
    expect(state.clearAriaLabel).toBe('Clear selected knowledge notes');
    expect(state.addNoteLabel).toBe('Add note');
    expect(state.addNoteAriaLabel).toBe('Open knowledge base to add note');
    expect(state.badgeText).toBeUndefined();
  });
});
