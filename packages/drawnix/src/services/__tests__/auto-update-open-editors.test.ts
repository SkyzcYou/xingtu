import { describe, expect, it } from 'vitest';
import { getOpenEditorBlockReason, type OpenEditorState } from '../auto-update-open-editors';

describe('unpersisted editor update veto', () => {
  it.each<keyof OpenEditorState>([
    'standaloneDialog', 'inlineText', 'linkEditor', 'mediaPreview',
    'backupRestore', 'cloudSync', 'mediaLibrary', 'profilePanel',
  ])('vetoes %s even after focus and pointer activity have stopped', (surface) => {
    expect(getOpenEditorBlockReason({ [surface]: true })).toBeTruthy();
  });

  it('permits an idle canvas after editing surfaces are closed', () => {
    expect(getOpenEditorBlockReason({})).toBeNull();
    expect(getOpenEditorBlockReason({ standaloneDialog: false, inlineText: false, linkEditor: false })).toBeNull();
  });
});
