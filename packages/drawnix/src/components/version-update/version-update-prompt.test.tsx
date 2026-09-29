import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAutoUpdateStatus } from '../../services/auto-update-state';
import { VersionUpdatePrompt } from './version-update-prompt';

vi.mock('tdesign-react', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Dialog: ({ visible, children, footer }: any) =>
    visible ? (
      <div>
        {children}
        {footer}
      </div>
    ) : null,
}));
vi.mock('tdesign-icons-react', () => ({ RefreshIcon: () => null }));
vi.mock('../../hooks/useTaskQueue', () => {
  const activeTasks: unknown[] = [];
  return { useTaskQueue: () => ({ activeTasks }) };
});
vi.mock('../../utils/active-tasks', () => ({
  hasActiveLLMTasksSync: () => false,
}));
vi.mock('../../services/workflow-submission-service', () => ({
  workflowSubmissionService: {
    subscribeToAllEvents: () => ({ unsubscribe() {} }),
  },
}));

beforeEach(() => {
  setAutoUpdateStatus(null);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
});
afterEach(() => {
  cleanup();
  setAutoUpdateStatus(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('VersionUpdatePrompt automatic policy', () => {
  it('shows a countdown and routes explicit actions to the safe coordinator', () => {
    setAutoUpdateStatus({
      version: '7.0.0',
      phase: 'countdown',
      remainingSeconds: 8,
      overdue: false,
      canPostpone: true,
    });
    const now = vi.fn();
    const postpone = vi.fn();
    const legacy = vi.fn();
    window.addEventListener('auto-update-now', now);
    window.addEventListener('auto-update-postpone', postpone);
    window.addEventListener('user-confirmed-upgrade', legacy);
    const { container } = render(<VersionUpdatePrompt />);
    expect(screen.getByRole('status').textContent).toContain(
      '8 秒后更新至 v7.0.0'
    );
    expect(container.querySelector('[data-auto-update-ui]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '稍后' }));
    fireEvent.click(screen.getByRole('button', { name: '立即更新' }));
    expect(postpone).toHaveBeenCalledTimes(1);
    expect(now).toHaveBeenCalledTimes(1);
    expect(legacy).not.toHaveBeenCalled();
    window.removeEventListener('auto-update-now', now);
    window.removeEventListener('auto-update-postpone', postpone);
    window.removeEventListener('user-confirmed-upgrade', legacy);
  });

  it('shows the veto reason and cannot postpone beyond the drain deadline', () => {
    setAutoUpdateStatus({
      version: '7.0.0',
      phase: 'blocked',
      reason: '另一个标签页正在生成',
      overdue: true,
      canPostpone: true,
    });
    render(<VersionUpdatePrompt />);
    expect(screen.getByRole('status').textContent).toContain(
      '另一个标签页正在生成'
    );
    expect(screen.getByRole('status').textContent).toContain('暂不接受新任务');
    expect(screen.queryByRole('button', { name: '稍后' })).toBeNull();
  });

  it('updates live status and disables actions once preparation begins', () => {
    setAutoUpdateStatus({
      version: '7.0.0',
      phase: 'waiting',
      overdue: false,
      canPostpone: true,
    });
    render(<VersionUpdatePrompt />);
    act(() =>
      setAutoUpdateStatus({
        version: '7.0.0',
        phase: 'preparing',
        overdue: false,
        canPostpone: false,
      })
    );
    expect(
      (screen.getByRole('button', { name: '正在更新' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(screen.getByRole('status').textContent).toContain(
      '正在保存当前工作'
    );
  });

  it('retains the legacy manual action and changelog when no automatic state exists', async () => {
    const legacy = vi.fn();
    window.addEventListener('user-confirmed-upgrade', legacy);
    render(<VersionUpdatePrompt />);
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('sw-update-available', {
          detail: { version: '6.7.31', changelog: ['修复画板保存'] },
        })
      );
    });
    fireEvent.click(screen.getByRole('button', { name: '查看更新内容' }));
    expect(screen.getByText('1. 修复画板保存')).not.toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: '立即更新' })[0]);
    expect(legacy).toHaveBeenCalledTimes(1);
    window.removeEventListener('user-confirmed-upgrade', legacy);
  });
});
