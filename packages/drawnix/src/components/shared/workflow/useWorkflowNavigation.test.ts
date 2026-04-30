import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorkflowNavigation } from './useWorkflowNavigation';

type PageId = 'analyze' | 'script' | 'generate' | 'history';
type StepId = Exclude<PageId, 'history'>;

describe('useWorkflowNavigation', () => {
  it('navigates between workflow steps', () => {
    const setShowStarred = vi.fn();
    const { result } = renderHook(() =>
      useWorkflowNavigation<PageId, StepId>({
        initialPage: 'analyze',
        defaultPage: 'analyze',
        historyPage: 'history',
        setShowStarred,
      })
    );

    act(() => {
      result.current.navigateToStep('script');
    });

    expect(result.current.page).toBe('script');
  });

  it('opens all-history view and resets starred filter', () => {
    const setShowStarred = vi.fn();
    const { result } = renderHook(() =>
      useWorkflowNavigation<PageId, StepId>({
        initialPage: 'analyze',
        defaultPage: 'analyze',
        historyPage: 'history',
        setShowStarred,
      })
    );

    act(() => {
      result.current.openHistory();
    });

    expect(result.current.page).toBe('history');
    expect(setShowStarred).toHaveBeenCalledWith(false);
  });

  it('opens starred view and enables starred filter', () => {
    const setShowStarred = vi.fn();
    const { result } = renderHook(() =>
      useWorkflowNavigation<PageId, StepId>({
        initialPage: 'analyze',
        defaultPage: 'analyze',
        historyPage: 'history',
        setShowStarred,
      })
    );

    act(() => {
      result.current.openStarred();
    });

    expect(result.current.page).toBe('history');
    expect(setShowStarred).toHaveBeenCalledWith(true);
  });

  it('returns to configured default page', () => {
    const setShowStarred = vi.fn();
    const { result } = renderHook(() =>
      useWorkflowNavigation<PageId, StepId>({
        initialPage: 'script',
        defaultPage: 'analyze',
        historyPage: 'history',
        setShowStarred,
      })
    );

    act(() => {
      result.current.goToDefaultPage();
    });

    expect(result.current.page).toBe('analyze');
  });

  it('toggles starred filter through provided setter', () => {
    const setShowStarred = vi.fn();
    const { result } = renderHook(() =>
      useWorkflowNavigation<PageId, StepId>({
        initialPage: 'analyze',
        defaultPage: 'analyze',
        historyPage: 'history',
        setShowStarred,
      })
    );

    act(() => {
      result.current.toggleStarred();
    });

    expect(setShowStarred).toHaveBeenCalledWith(expect.any(Function));
  });
});
