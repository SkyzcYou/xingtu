import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { autoUpdateSafety } from '../auto-update-safety';
import { assertGenerationAdmission } from '../generation-admission';
import {
  workflowSubmissionService,
  type WorkflowDefinition,
} from '../workflow-submission-service';

const mocks = vi.hoisted(() => ({
  options: null as any,
  submit: vi.fn(async (_workflow: unknown) => undefined),
  flush: vi.fn(async () => undefined),
}));
vi.mock('../sw-capabilities', () => ({
  swCapabilitiesHandler: { execute: vi.fn() },
}));
vi.mock('../workflow-storage-reader', () => ({
  workflowStorageReader: { invalidateCache: vi.fn() },
}));
vi.mock('../media-executor', () => ({
  executorFactory: { getFallbackExecutor: () => ({}) },
}));
vi.mock('../../utils/settings-manager', () => ({
  geminiSettings: { get: () => ({}) },
}));
vi.mock('../workflow-engine', () => ({
  WorkflowEngine: class {
    constructor(options: unknown) {
      mocks.options = options;
    }
    submitWorkflow = mocks.submit;
    destroy() {}
    async cancelWorkflow(workflowId: string) {
      mocks.options.onEvent({
        type: 'status',
        workflowId,
        status: 'cancelled',
      });
    }
  },
  workflowStorageWriter: {
    pauseWrites: vi.fn(),
    clearAllWorkflows: vi.fn(),
    flushForUpdate: mocks.flush,
  },
}));

function workflow(id = 'test-workflow'): WorkflowDefinition {
  return {
    id,
    name: 'Test',
    status: 'pending',
    steps: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

beforeEach(async () => {
  await workflowSubmissionService.clearAllWorkflows();
  autoUpdateSafety.setAppReady(true);
  autoUpdateSafety.setDraining(false);
  vi.clearAllMocks();
  mocks.flush.mockResolvedValue(undefined);
});
afterEach(() => {
  autoUpdateSafety.setDraining(false);
  autoUpdateSafety.release('workflow-update');
});

describe('workflow automatic-update boundary', () => {
  it('rejects new root submissions while allowing admitted steps to drain', async () => {
    await workflowSubmissionService.submit(workflow());
    autoUpdateSafety.setDraining(true);
    await expect(
      workflowSubmissionService.submit(workflow('new-workflow'))
    ).rejects.toThrow('自动更新');
    expect(mocks.submit).toHaveBeenCalledTimes(1);
    expect(() => assertGenerationAdmission('test-workflow')).not.toThrow();
    expect(() => assertGenerationAdmission('new-workflow')).toThrow('自动更新');
    expect(await autoUpdateSafety.getBlockReason()).toBe('正在完成工作流');
  });

  it('releases the drain veto after cancellation, then awaits strict persistence', async () => {
    await workflowSubmissionService.submit(workflow());
    await workflowSubmissionService.cancel('test-workflow');
    expect(workflowSubmissionService.getRunningWorkflows()).toEqual([]);
    autoUpdateSafety.setDraining(true);
    expect(() => assertGenerationAdmission('test-workflow')).toThrow(
      '自动更新'
    );
    expect(await autoUpdateSafety.prepare('workflow-update')).toEqual({
      ready: true,
    });
    expect(mocks.flush).toHaveBeenCalledWith();
  });

  it('vetoes update when completed workflow results cannot be saved', async () => {
    await workflowSubmissionService.submit(workflow());
    workflowSubmissionService.notifyWorkflowCompleted('test-workflow', {
      ...workflow(),
      status: 'completed',
    });
    mocks.flush.mockRejectedValueOnce(new Error('工作流保存失败'));
    expect(await autoUpdateSafety.prepare('workflow-update')).toEqual({
      ready: false,
      reason: '工作流保存失败',
    });
    expect(autoUpdateSafety.isLocked()).toBe(false);
    expect(await autoUpdateSafety.prepare('workflow-update')).toEqual({
      ready: true,
    });
  });
});
