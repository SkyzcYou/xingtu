// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PromptOptimizeButton } from './PromptOptimizeButton';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const mockDialog = vi.fn();
let roots: Root[] = [];

vi.mock('./hover', () => ({
  HoverTip: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock('lucide-react', () => ({
  Sparkles: () => React.createElement('span', { 'aria-hidden': 'true' }),
}));

vi.mock('./PromptOptimizeDialog', () => ({
  PromptOptimizeDialog: (props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onApply: (prompt: string) => void;
  }) => {
    mockDialog(props);
    return props.open ? (
      <button type="button" onClick={() => props.onApply('优化后')}>
        mock apply
      </button>
    ) : null;
  },
}));

describe('PromptOptimizeButton', () => {
  afterEach(() => {
    roots.forEach((root) => {
      act(() => root.unmount());
    });
    roots = [];
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  const renderButton = (
    props: Partial<React.ComponentProps<typeof PromptOptimizeButton>> = {}
  ) => {
    const onApply = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => {
      root.render(
        <PromptOptimizeButton
          originalPrompt="原始"
          language="zh"
          scenarioId="ai-input.image"
          onApply={onApply}
          {...props}
        />
      );
    });

    return { onApply };
  };

  it('opens the shared dialog and fills back optimized prompt', () => {
    const { onApply } = renderButton();

    act(() => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="提示词优化"]')
        ?.click();
    });
    expect(mockDialog.mock.calls.at(-1)?.[0]).toMatchObject({ open: true });

    act(() => {
      Array.from(document.body.querySelectorAll('button'))
        .find((button) => button.textContent === 'mock apply')
        ?.click();
    });
    expect(onApply).toHaveBeenCalledWith('优化后');
  });

  it('keeps disabled state on the trigger', () => {
    renderButton({ disabled: true });

    expect(
      document.querySelector<HTMLButtonElement>('[aria-label="提示词优化"]')
        ?.disabled
    ).toBe(true);
  });
});
