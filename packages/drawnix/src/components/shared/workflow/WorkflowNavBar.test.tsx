import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkflowNavBar, type WorkflowNavBarProps } from './WorkflowNavBar';
import type { WorkflowStepConfig } from './WorkflowStepBar';

type StepId = 'analyze' | 'script' | 'generate';

const steps: WorkflowStepConfig<StepId>[] = [
  { id: 'analyze', label: '分析' },
  { id: 'script', label: '脚本' },
  { id: 'generate', label: '生成' },
];

function renderNav(overrides: Partial<WorkflowNavBarProps<StepId>> = {}) {
  const props: WorkflowNavBarProps<StepId> = {
    isHistoryPage: false,
    showStarred: false,
    recordsCount: 2,
    starredCount: 1,
    currentStep: 'analyze',
    steps,
    onStepNavigate: vi.fn(),
    onBackFromHistory: vi.fn(),
    onOpenHistory: vi.fn(),
    onOpenStarred: vi.fn(),
    onToggleStarred: vi.fn(),
    ...overrides,
  };

  const view = render(<WorkflowNavBar {...props} />);
  return { props, view };
}

afterEach(() => {
  cleanup();
});

describe('WorkflowNavBar', () => {
  it('renders steps and history/starred counts in workflow mode', () => {
    const { view } = renderNav();

    expect(screen.getByRole('button', { name: /1\s*分析/ })).toBeTruthy();
    expect(screen.getByLabelText('history')).toBeTruthy();
    expect(screen.getByLabelText('starred')).toBeTruthy();
    expect(
      Array.from(view.container.querySelectorAll('.va-nav-count')).map(
        (node) => node.textContent
      )
    ).toEqual(['2', '1']);
  });

  it('opens history and starred views from action buttons', () => {
    const { props } = renderNav();

    fireEvent.click(
      screen.getByLabelText('history').closest('button') as HTMLButtonElement
    );
    fireEvent.click(
      screen.getByLabelText('starred').closest('button') as HTMLButtonElement
    );

    expect(props.onOpenHistory).toHaveBeenCalledTimes(1);
    expect(props.onOpenStarred).toHaveBeenCalledTimes(1);
  });

  it('renders history title, back button, and starred toggle in history mode', () => {
    const { props } = renderNav({
      isHistoryPage: true,
      showStarred: true,
    });

    expect(screen.getByText('收藏')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '←' }));
    fireEvent.click(screen.getByRole('button', { name: '★ 收藏' }));

    expect(props.onBackFromHistory).toHaveBeenCalledTimes(1);
    expect(props.onToggleStarred).toHaveBeenCalledTimes(1);
  });

  it('omits count badges when counts are zero', () => {
    const { view } = renderNav({
      recordsCount: 0,
      starredCount: 0,
    });

    expect(view.container.querySelector('.va-nav-count')).toBeNull();
  });
});
