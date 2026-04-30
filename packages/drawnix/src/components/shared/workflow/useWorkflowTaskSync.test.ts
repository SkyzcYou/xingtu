import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskStatus, TaskType, type Task } from '../../../types/task.types';
import { useWorkflowTaskSync } from './useWorkflowTaskSync';
import type {
  WorkflowRecordBase,
  WorkflowSyncRecordResult,
} from './useWorkflowRecords';

const { taskListeners, taskState } = vi.hoisted(() => ({
  taskListeners: [] as Array<(event: { task: Task }) => void>,
  taskState: {
    tasks: [] as Task[],
  },
}));

vi.mock('../../../services/task-queue', () => ({
  taskQueueService: {
    getAllTasks: () => taskState.tasks,
    observeTaskUpdates: () => ({
      subscribe: (listener: (event: { task: Task }) => void) => {
        taskListeners.push(listener);
        return {
          unsubscribe: () => {
            const index = taskListeners.indexOf(listener);
            if (index >= 0) {
              taskListeners.splice(index, 1);
            }
          },
        };
      },
    }),
  },
}));

interface TestRecord extends WorkflowRecordBase {
  label: string;
}

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task_1',
    type: TaskType.CHAT,
    status: TaskStatus.COMPLETED,
    params: {
      prompt: 'test',
    },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  } as Task;
}

function createSyncResult(
  id = 'record_1'
): WorkflowSyncRecordResult<TestRecord> {
  const record = {
    id,
    label: 'Synced',
    starred: false,
  };
  return {
    records: [record],
    record,
  };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useWorkflowTaskSync', () => {
  beforeEach(() => {
    taskListeners.length = 0;
    taskState.tasks = [];
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('syncs existing completed tasks on mount', async () => {
    const completedTask = createTask({ id: 'completed' });
    const failedTask = createTask({ id: 'failed', status: TaskStatus.FAILED });
    taskState.tasks = [completedTask, failedTask];
    const syncTask = vi.fn(async () => createSyncResult());
    const applySyncedRecord = vi.fn();

    renderHook(() =>
      useWorkflowTaskSync({
        syncTask,
        applySyncedRecord,
      })
    );
    await flushEffects();

    expect(syncTask).toHaveBeenCalledTimes(1);
    expect(syncTask).toHaveBeenCalledWith(completedTask);
    expect(applySyncedRecord).toHaveBeenCalledWith(createSyncResult());
  });

  it('syncs future completed task updates', async () => {
    const syncTask = vi.fn(async () => createSyncResult('record_2'));
    const applySyncedRecord = vi.fn();

    renderHook(() =>
      useWorkflowTaskSync({
        syncTask,
        applySyncedRecord,
      })
    );

    const completedTask = createTask({ id: 'future' });
    await act(async () => {
      taskListeners[0]({ task: completedTask });
      await Promise.resolve();
    });

    expect(syncTask).toHaveBeenCalledWith(completedTask);
    expect(applySyncedRecord).toHaveBeenCalledWith(
      createSyncResult('record_2')
    );
  });

  it('dedupes in-flight task synchronization by task id', async () => {
    let resolveSync: (
      value: WorkflowSyncRecordResult<TestRecord>
    ) => void = () => undefined;
    const syncTask = vi.fn(
      () =>
        new Promise<WorkflowSyncRecordResult<TestRecord>>((resolve) => {
          resolveSync = resolve;
        })
    );
    const applySyncedRecord = vi.fn();

    renderHook(() =>
      useWorkflowTaskSync({
        syncTask,
        applySyncedRecord,
      })
    );

    const task = createTask({ id: 'duplicate' });
    taskListeners[0]({ task });
    taskListeners[0]({ task });
    expect(syncTask).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSync(createSyncResult('deduped'));
      await Promise.resolve();
    });

    expect(applySyncedRecord).toHaveBeenCalledWith(createSyncResult('deduped'));
  });

  it('unsubscribes on unmount and ignores late sync results', async () => {
    let resolveSync: (
      value: WorkflowSyncRecordResult<TestRecord>
    ) => void = () => undefined;
    const syncTask = vi.fn(
      () =>
        new Promise<WorkflowSyncRecordResult<TestRecord>>((resolve) => {
          resolveSync = resolve;
        })
    );
    const applySyncedRecord = vi.fn();

    const { unmount } = renderHook(() =>
      useWorkflowTaskSync({
        syncTask,
        applySyncedRecord,
      })
    );
    expect(taskListeners.length).toBe(1);

    taskListeners[0]({ task: createTask({ id: 'late' }) });
    unmount();
    expect(taskListeners.length).toBe(0);

    await act(async () => {
      resolveSync(createSyncResult('late'));
      await Promise.resolve();
    });

    expect(applySyncedRecord).not.toHaveBeenCalled();
  });

  it('logs handler errors and keeps syncing later tasks', async () => {
    const syncTask = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(createSyncResult('after_error'));
    const applySyncedRecord = vi.fn();

    renderHook(() =>
      useWorkflowTaskSync({
        syncTask,
        applySyncedRecord,
      })
    );

    await act(async () => {
      taskListeners[0]({ task: createTask({ id: 'first' }) });
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      taskListeners[0]({ task: createTask({ id: 'second' }) });
      await Promise.resolve();
    });

    expect(syncTask).toHaveBeenCalledTimes(2);
    expect(applySyncedRecord).toHaveBeenCalledWith(
      createSyncResult('after_error')
    );
  });
});
