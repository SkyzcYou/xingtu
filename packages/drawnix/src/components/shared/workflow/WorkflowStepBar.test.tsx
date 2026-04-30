import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkflowStepBar, type WorkflowStepConfig } from './WorkflowStepBar';

type StepId = 'analyze' | 'script' | 'generate';

const steps: WorkflowStepConfig<StepId>[] = [
  { id: 'analyze', label: '分析' },
  { id: 'script', label: '脚本' },
  { id: 'generate', label: '生成' },
];

afterEach(() => {
  cleanup();
});

describe('WorkflowStepBar', () => {
  it('marks active and past steps', () => {
    render(
      <WorkflowStepBar current="script" steps={steps} onNavigate={vi.fn()} />
    );

    const analyzeButton = screen.getByRole('button', { name: /1\s*分析/ });
    const scriptButton = screen.getByRole('button', { name: /2\s*脚本/ });
    const generateButton = screen.getByRole('button', { name: /3\s*生成/ });

    expect(analyzeButton.className).toContain('past');
    expect(scriptButton.className).toContain('active');
    expect(generateButton.className).not.toContain('past');
  });

  it('navigates when enabled step is clicked', () => {
    const onNavigate = vi.fn();
    render(
      <WorkflowStepBar
        current="analyze"
        steps={steps}
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /2\s*脚本/ }));

    expect(onNavigate).toHaveBeenCalledWith('script');
  });

  it('does not navigate when a step is disabled', () => {
    const onNavigate = vi.fn();
    render(
      <WorkflowStepBar
        current="analyze"
        steps={[
          steps[0],
          { ...steps[1], disabled: true },
          { ...steps[2], disabled: true },
        ]}
        onNavigate={onNavigate}
      />
    );

    const scriptButton = screen.getByRole('button', {
      name: /2\s*脚本/,
    }) as HTMLButtonElement;
    fireEvent.click(scriptButton);

    expect(scriptButton.disabled).toBe(true);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('supports MV shot-dependent disabled rules through step config', () => {
    render(
      <WorkflowStepBar
        current="analyze"
        steps={[
          { id: 'analyze', label: '分析' },
          { id: 'script', label: '脚本', disabled: true },
          { id: 'generate', label: '生成', disabled: true },
        ]}
        onNavigate={vi.fn()}
      />
    );

    expect(
      (screen.getByRole('button', { name: /2\s*脚本/ }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: /3\s*生成/ }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });
});
