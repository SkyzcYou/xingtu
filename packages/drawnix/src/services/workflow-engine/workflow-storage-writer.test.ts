import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeAppDB, getAppDB, APP_DB_STORES } from '../app-database';
import * as appDatabase from '../app-database';
import type { Workflow } from './types';
import { workflowStorageWriter } from './workflow-storage-writer';

function createWorkflow(status: Workflow['status'] = 'pending'): Workflow {
  return {
    id: 'workflow-1',
    name: 'test workflow',
    steps: [],
    status,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('workflow-storage-writer clear barrier', () => {
  beforeEach(() => {
    closeAppDB();
    workflowStorageWriter.resumeWrites();
    vi.stubGlobal('indexedDB', new IDBFactory());
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    workflowStorageWriter.resumeWrites();
    await workflowStorageWriter.clearAllWorkflows();
    closeAppDB();
    workflowStorageWriter.resumeWrites();
    vi.unstubAllGlobals();
  });

  it('blocks late saves while still allowing the workflow store to be cleared', async () => {
    await workflowStorageWriter.saveWorkflow(createWorkflow());
    workflowStorageWriter.pauseWrites();
    await workflowStorageWriter.saveWorkflow(createWorkflow('completed'));

    expect(await workflowStorageWriter.getWorkflow('workflow-1')).toMatchObject(
      {
        status: 'pending',
      }
    );

    await workflowStorageWriter.clearAllWorkflows();
    expect(await workflowStorageWriter.getWorkflow('workflow-1')).toBeNull();
  });
  it("does not rewrite a clean historical workflow with another tab's richer state", async () => {
    await workflowStorageWriter.saveWorkflow(createWorkflow());
    const richer: Workflow = {
      ...createWorkflow('completed'),
      updatedAt: 20,
      steps: [
        {
          id: 'dynamic-step',
          mcp: 'insert_to_canvas',
          args: { content: 'retained result' },
          description: 'Added dynamically',
          status: 'completed',
        },
      ],
    };
    const db = await getAppDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(APP_DB_STORES.WORKFLOWS, 'readwrite');
      transaction.objectStore(APP_DB_STORES.WORKFLOWS).put(richer);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    await workflowStorageWriter.flushForUpdate();
    expect(await workflowStorageWriter.getWorkflow('workflow-1')).toEqual(
      richer
    );
  });

  it('retries its exact uncommitted snapshot and requires a committed write', async () => {
    const unavailable = vi
      .spyOn(appDatabase, 'getAppDB')
      .mockRejectedValueOnce(new Error('存储不可用'));
    const snapshot = createWorkflow('completed');
    await workflowStorageWriter.saveWorkflow(snapshot);
    snapshot.name = 'later in-memory mutation';
    unavailable.mockRejectedValueOnce(new Error('仍然不可用'));
    await expect(workflowStorageWriter.flushForUpdate()).rejects.toThrow(
      '仍然不可用'
    );
    unavailable.mockRestore();
    await workflowStorageWriter.flushForUpdate();
    expect(await workflowStorageWriter.getWorkflow('workflow-1')).toMatchObject(
      { status: 'completed', name: 'test workflow' }
    );
  });

  it('never retries a deleted workflow after its previous save failed', async () => {
    vi.spyOn(appDatabase, 'getAppDB').mockRejectedValueOnce(
      new Error('存储不可用')
    );
    await workflowStorageWriter.saveWorkflow(createWorkflow());
    await workflowStorageWriter.deleteWorkflow('workflow-1');
    await workflowStorageWriter.flushForUpdate();
    expect(await workflowStorageWriter.getWorkflow('workflow-1')).toBeNull();
  });
});
