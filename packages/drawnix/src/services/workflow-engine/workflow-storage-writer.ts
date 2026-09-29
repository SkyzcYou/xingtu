/**
 * Workflow Storage Writer
 *
 * 主线程写入工作流数据到 aitu-app 数据库。
 * 使用主线程专用数据库，不再与 SW 共享，无 IDB 并发竞争。
 */

import type { Workflow } from './types';
import { getAppDB, APP_DB_STORES } from '../app-database';

const WORKFLOWS_STORE = APP_DB_STORES.WORKFLOWS;

/**
 * 工作流存储写入器
 */
class WorkflowStorageWriter {
  private writesPaused = false;
  private pendingWrites = new Set<Promise<void>>();
  private dirtyWorkflows = new Map<string, { snapshot: Workflow }>();

  pauseWrites(): void {
    this.writesPaused = true;
  }

  resumeWrites(): void {
    this.writesPaused = false;
  }

  /**
   * 检查是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const db = await getAppDB();
      return db.objectStoreNames.contains(WORKFLOWS_STORE);
    } catch {
      return false;
    }
  }

  /**
   * 获取数据库连接
   */
  private async getDB(): Promise<IDBDatabase> {
    return getAppDB();
  }

  /**
   * 保存工作流
   * 降级模式下 IndexedDB 可能不可用，失败时静默跳过，不阻塞工作流执行
   */
  async saveWorkflow(workflow: Workflow): Promise<void> {
    if (this.writesPaused) return;
    let snapshot: Workflow;
    try {
      snapshot = structuredClone(workflow);
    } catch {
      // Retain an uncloneable write as dirty; strict flush will veto the update.
      snapshot = workflow;
    }
    const dirty = { snapshot };
    this.dirtyWorkflows.set(workflow.id, dirty);
    const writing = this.persistWorkflow(snapshot).then(
      () => {
        if (this.dirtyWorkflows.get(workflow.id) === dirty) {
          this.dirtyWorkflows.delete(workflow.id);
        }
      },
      () => undefined // Preserve existing lenient execution; update flush is strict.
    );
    this.pendingWrites.add(writing);
    try {
      await writing;
    } finally {
      this.pendingWrites.delete(writing);
    }
  }

  /** Flush only this writer's uncommitted snapshots, never clean history or
   * service-layer projections which may be stale or omit dynamically added steps. */
  async flushForUpdate(): Promise<void> {
    await Promise.all(this.pendingWrites);
    for (const [workflowId, dirty] of [...this.dirtyWorkflows]) {
      await this.persistWorkflow(dirty.snapshot, true);
      if (this.dirtyWorkflows.get(workflowId) === dirty) {
        this.dirtyWorkflows.delete(workflowId);
      }
    }
  }

  private async persistWorkflow(
    workflow: Workflow,
    checkNewer = false
  ): Promise<void> {
    if (this.writesPaused) throw new Error('工作流数据正在恢复，请稍后更新');
    const db = await this.getDB();
    if (this.writesPaused) throw new Error('工作流数据正在恢复，请稍后更新');
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(WORKFLOWS_STORE, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error || new Error('工作流保存失败'));
      transaction.onabort = () =>
        reject(transaction.error || new Error('工作流保存中断'));
      const store = transaction.objectStore(WORKFLOWS_STORE);
      if (checkNewer) {
        const read = store.get(workflow.id);
        read.onsuccess = () => {
          if (read.result && read.result.updatedAt > workflow.updatedAt) {
            reject(new Error('其他标签页已更新该工作流，请先完成同步'));
            transaction.abort();
            return;
          }
          store.put(workflow);
        };
      } else {
        store.put(workflow);
      }
    });
  }

  /**
   * 获取工作流
   */
  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    if (!workflowId) {
      return null;
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(WORKFLOWS_STORE, 'readonly');
      const store = transaction.objectStore(WORKFLOWS_STORE);
      const request = store.get(workflowId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    if (!workflowId || this.writesPaused) {
      return;
    }

    const db = await this.getDB();
    if (this.writesPaused) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(WORKFLOWS_STORE, 'readwrite');
      const store = transaction.objectStore(WORKFLOWS_STORE);
      const request = store.delete(workflowId);

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => {
        this.dirtyWorkflows.delete(workflowId);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error || request.error);
      transaction.onabort = () =>
        reject(transaction.error || new Error('Workflow delete aborted'));
    });
  }

  async clearAllWorkflows(): Promise<void> {
    await Promise.all(this.pendingWrites);
    const db = await this.getDB();
    if (!db.objectStoreNames.contains(WORKFLOWS_STORE)) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(WORKFLOWS_STORE, 'readwrite');
      transaction.objectStore(WORKFLOWS_STORE).clear();
      transaction.oncomplete = () => {
        this.dirtyWorkflows.clear();
        resolve();
      };
      transaction.onerror = () =>
        reject(transaction.error || new Error('Workflow storage clear failed'));
      transaction.onabort = () =>
        reject(
          transaction.error || new Error('Workflow storage clear aborted')
        );
    });
  }

  /**
   * 关闭数据库连接（现在由 app-database 集中管理）
   */
  close(): void {
    // no-op: 连接由 app-database 模块管理
  }
}

/**
 * 工作流存储写入器单例
 */
export const workflowStorageWriter = new WorkflowStorageWriter();
