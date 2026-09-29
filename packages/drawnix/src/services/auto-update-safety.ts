/**
 * Application-wide admission and persistence boundary for an automatic update.
 * This module deliberately does not import task executors (which use it too).
 */
export interface AutoUpdateParticipant {
  getBlockReason: () => string | null | Promise<string | null>;
  flush?: () => Promise<void>;
  /** Discard snapshots prepared only for an upgrade that was aborted. */
  cancel?: () => void;
}

export class UpdateInProgressError extends Error {
  constructor() {
    super('新版本即将自动更新，请等待已有任务完成和更新结束后再开始新任务。');
    this.name = 'UpdateInProgressError';
  }
}

export class AutoUpdateSafety {
  private participants = new Map<string, AutoUpdateParticipant>();
  private operations = new Map<symbol, string>();
  private participantRevision = 0;
  private appReady = false;
  private preparationInFlight = false;
  private draining = false;
  private lockId: string | null = null;
  private preparing: Promise<{ ready: boolean; reason?: string }> | null = null;

  registerParticipant(
    id: string,
    participant: AutoUpdateParticipant
  ): () => void {
    this.participants.set(id, participant);
    this.participantRevision += 1;
    return () => {
      if (this.participants.get(id) === participant) {
        this.participants.delete(id);
        this.participantRevision += 1;
      }
    };
  }

  setAppReady(ready: boolean): void {
    this.appReady = ready;
  }

  setDraining(draining: boolean): void {
    this.draining = draining;
  }

  isLocked(): boolean {
    return this.lockId !== null;
  }

  isDraining(): boolean {
    return this.draining;
  }

  assertCanStartWork(options: { allowDuringDrain?: boolean } = {}): void {
    if (this.lockId || (this.draining && !options.allowDuringDrain)) {
      throw new UpdateInProgressError();
    }
  }

  beginOperation(
    reason: string,
    options: { allowDuringDrain?: boolean } = {}
  ): () => void {
    this.assertCanStartWork(options);
    const token = Symbol(reason);
    this.operations.set(token, reason);
    return () => this.operations.delete(token);
  }

  async getBlockReason(): Promise<string | null> {
    if (!this.appReady) return '正在恢复工作台';
    if (this.operations.size > 0)
      return this.operations.values().next().value || '操作进行中';
    try {
      for (const participant of this.participants.values()) {
        const reason = await participant.getBlockReason();
        if (reason) return reason;
      }
    } catch {
      return '暂时无法确认工作已保存';
    }
    return null;
  }

  prepare(requestId: string): Promise<{ ready: boolean; reason?: string }> {
    if (this.lockId === requestId && this.preparing) return this.preparing;
    if (this.lockId || this.preparationInFlight)
      return Promise.resolve({ ready: false, reason: '另一个更新正在准备' });
    // Acquire before any await: no new task may sneak in between checking and saving.
    this.lockId = requestId;
    this.preparationInFlight = true;
    const revision = this.participantRevision;
    const preparation = (async () => {
      try {
        const reason = await this.getBlockReason();
        if (reason) throw new Error(reason);
        for (const participant of [...this.participants.values()]) {
          if (this.lockId !== requestId) throw new Error('更新准备已取消');
          await participant.flush?.();
        }
        if (
          this.lockId !== requestId ||
          revision !== this.participantRevision
        ) {
          throw new Error('工作台状态已变化，稍后重试');
        }
        const afterSaveReason = await this.getBlockReason();
        if (afterSaveReason) throw new Error(afterSaveReason);
        if (
          this.lockId !== requestId ||
          revision !== this.participantRevision ||
          !this.appReady ||
          this.operations.size > 0
        ) {
          throw new Error('工作台状态已变化，稍后重试');
        }
        return { ready: true };
      } catch (error) {
        this.release(requestId);
        if (!this.lockId) this.cancelSnapshots();
        return {
          ready: false,
          reason:
            error instanceof Error ? error.message : '保存失败，已保留当前版本',
        };
      } finally {
        this.preparationInFlight = false;
      }
    })();
    this.preparing = preparation;
    return preparation;
  }

  release(requestId: string): void {
    if (this.lockId === requestId) {
      this.lockId = null;
      this.preparing = null;
      this.cancelSnapshots();
    }
  }

  private cancelSnapshots(): void {
    for (const participant of this.participants.values()) {
      try {
        participant.cancel?.();
      } catch {
        /* Cleanup must not retain an admission lock. */
      }
    }
  }
}

export const autoUpdateSafety = new AutoUpdateSafety();
