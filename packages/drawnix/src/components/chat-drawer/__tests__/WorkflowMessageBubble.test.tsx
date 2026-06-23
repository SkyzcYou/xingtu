import React from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { WorkflowMessageData } from '../../../types/chat.types';
import { WorkflowMessageBubble } from '../WorkflowMessageBubble';
import {
  getWorkflowBubbleStatus,
  normalizeWorkflowStepsForDisplay,
} from '../../../utils/workflow-bubble-status';

vi.mock('../../shared/media-preview/UnifiedMediaViewer', () => ({
  UnifiedMediaViewer: ({
    visible,
    initialIndex,
  }: {
    visible: boolean;
    initialIndex: number | number[];
  }) =>
    visible ? (
      <div data-testid="unified-media-viewer">viewer-{initialIndex}</div>
    ) : null,
}));

function createImageWorkflow(
  overrides: Partial<WorkflowMessageData> = {}
): WorkflowMessageData {
  const baseSteps: WorkflowMessageData['steps'] = [1, 2, 3].map((index) => ({
    id: `step-${index}`,
    description: `生成图片 (${index}/3)`,
    status: 'completed' as const,
    mcp: 'generate_image',
    args: {
      prompt: '生成一个超级苹果。',
    },
    result: {
      taskId: `task-${index}`,
      result: {
        url: `/__aitu_cache__/image/task-${index}.png`,
        format: 'png',
        size: 123,
      },
    },
    options: {
      batchId: 'wf_batch_wf-1',
      batchIndex: index,
      batchTotal: 3,
    },
  }));

  return {
    id: 'wf-1',
    name: '图片生成',
    generationType: 'image',
    prompt: '生成一个超级苹果。',
    count: 3,
    status: 'completed',
    steps: baseSteps,
    ...overrides,
  };
}

function createFailedWorkflow(): WorkflowMessageData {
  return createImageWorkflow({
    status: 'failed',
    steps: createImageWorkflow().steps.map((step) => ({
      ...step,
      status: 'failed',
      error: '图片生成失败',
      result: { taskId: `task-${step.options?.batchIndex}` },
    })),
    retryContext: {
      aiContext: {} as WorkflowMessageData['retryContext']['aiContext'],
      referenceImages: [],
    },
  });
}

beforeEach(() => {
  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  };
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe('WorkflowMessageBubble status helpers', () => {
  it('shows image workflow as completed when all generation tasks are completed', () => {
    const workflow = createImageWorkflow();
    const steps = normalizeWorkflowStepsForDisplay(workflow.steps);

    expect(getWorkflowBubbleStatus(steps)).toEqual({
      status: 'completed',
      totalSteps: 3,
      completedSteps: 3,
    });
  });

  it('does not keep a completed image workflow running because post-processing is missing', () => {
    const workflow = createImageWorkflow({
      postProcessingStatus: undefined,
    });
    const steps = normalizeWorkflowStepsForDisplay(workflow.steps);

    expect(getWorkflowBubbleStatus(steps).status).toBe('completed');
  });
});

describe('WorkflowMessageBubble rendering', () => {
  it('hides completed media steps by default and omits redundant generated summary', () => {
    render(<WorkflowMessageBubble workflow={createImageWorkflow()} />);

    expect(screen.getByText('图片生成')).toBeTruthy();
    expect(screen.getAllByText('已完成')).toHaveLength(1);
    expect(screen.getByText('3/3')).toBeTruthy();
    expect(screen.queryByText('生成图片 (1/3)')).toBeNull();
    expect(screen.queryByText('已生成')).toBeNull();
    expect(
      screen
        .getByRole('button', { name: '查看执行详情' })
        .getAttribute('aria-expanded')
    ).toBe('false');
  });

  it('reveals completed media steps from the details toggle', () => {
    render(<WorkflowMessageBubble workflow={createImageWorkflow()} />);

    const toggle = screen.getByRole('button', { name: '查看执行详情' });
    fireEvent.click(toggle);

    expect(screen.getByText('生成图片 (1/3)')).toBeTruthy();
    expect(screen.getByText('生成图片 (2/3)')).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders media results as preview buttons', () => {
    render(<WorkflowMessageBubble workflow={createImageWorkflow()} />);

    expect(screen.getByLabelText('生成结果')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '查看生成结果 1' })
    ).toBeTruthy();
  });

  it('opens the unified media viewer from a media result', () => {
    render(<WorkflowMessageBubble workflow={createImageWorkflow()} />);

    fireEvent.doubleClick(
      screen.getByRole('button', { name: '查看生成结果 2' })
    );

    expect(screen.getByTestId('unified-media-viewer').textContent).toBe(
      'viewer-1'
    );
  });

  it('calls reply handler from the workflow media action row', () => {
    const onReply = vi.fn();
    render(
      <WorkflowMessageBubble workflow={createImageWorkflow()} onReply={onReply} />
    );

    fireEvent.click(screen.getByRole('button', { name: '回复' }));

    expect(onReply).toHaveBeenCalledTimes(1);
  });

  it('omits markdown summary when generated media results are present', () => {
    const workflow = createImageWorkflow({
      steps: createImageWorkflow().steps.map((step, index) => ({
        ...step,
        result: {
          content: '这段摘要不应重复显示',
          imageUrl: `/__aitu_cache__/image/result-${index}.png`,
        },
      })),
    });

    render(<WorkflowMessageBubble workflow={workflow} />);

    expect(screen.queryByText('这段摘要不应重复显示')).toBeNull();
    expect(screen.getByLabelText('生成结果')).toBeTruthy();
  });

  it('keeps running workflow steps visible immediately', () => {
    render(
      <WorkflowMessageBubble
        workflow={createImageWorkflow({
          status: 'running',
          steps: createImageWorkflow().steps.map((step, index) => ({
            ...step,
            status: index === 0 ? 'running' : 'pending',
            result: undefined,
          })),
        })}
      />
    );

    expect(screen.getByText('生成图片 (1/3)')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: '查看执行详情' })
    ).toBeNull();
  });

  it('keeps failed workflow details and retry controls visible', () => {
    render(
      <WorkflowMessageBubble
        workflow={createFailedWorkflow()}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText('生成图片 (1/3)')).toBeTruthy();
    expect(screen.getByText('执行失败，请重试')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /从失败步骤重试/ })
    ).toBeTruthy();
  });
});
