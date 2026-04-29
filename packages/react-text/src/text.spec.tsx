import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Text } from './text';
import type { ParagraphElement } from '@plait/common';
import type { CustomEditor } from './custom-types';

describe('Text', () => {
  it('should render successfully', () => {
    const ele: ParagraphElement = {
      children: [{ text: '' }],
      type: 'paragraph',
    };
    const { baseElement } = render(<Text text={ele} />);
    expect(baseElement).toBeTruthy();
  });

  it('clears stale selection paths when text changes', async () => {
    let editor: CustomEditor | undefined;
    const longText: ParagraphElement = {
      children: Array.from({ length: 14 }, (_, index) => ({
        text: `line-${index}`,
      })),
      type: 'paragraph',
    };
    const shortText: ParagraphElement = {
      children: [{ text: 'short' }],
      type: 'paragraph',
    };

    const { rerender } = render(
      <Text
        text={longText}
        afterInit={(initializedEditor) => {
          editor = initializedEditor as CustomEditor;
        }}
      />
    );

    await waitFor(() => {
      expect(editor).toBeDefined();
    });

    editor!.selection = {
      anchor: { path: [0, 13], offset: 0 },
      focus: { path: [0, 13], offset: 0 },
    };
    editor!.history.undos.push([
      {
        type: 'remove_node',
        path: [0, 13],
        node: { text: 'line-13' },
      },
    ]);

    rerender(<Text text={shortText} />);

    await waitFor(() => {
      expect(editor!.selection).toBeNull();
    });
    expect(editor!.history.undos).toHaveLength(0);
    expect(() => editor!.undo()).not.toThrow();
  });
});
