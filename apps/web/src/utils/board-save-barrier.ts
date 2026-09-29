/** Tracks the exact revisions written by autosave before a controlled reload. */
export class BoardSaveBarrier {
  private revisions = new Map<string, number>();
  private savedRevisions = new Map<string, number>();
  private tails = new Map<string, Promise<void>>();
  private pending = new Set<Promise<void>>();
  private failures = new Map<string, { revision: number; error: unknown }>();

  markDirty(boardId: string): number {
    const revision = this.getRevision(boardId) + 1;
    this.revisions.set(boardId, revision);
    return revision;
  }

  getRevision(boardId: string): number {
    return this.revisions.get(boardId) || 0;
  }

  isDirty(boardId: string): boolean {
    return this.getRevision(boardId) > (this.savedRevisions.get(boardId) || 0);
  }

  hasFailure(): boolean {
    return this.failures.size > 0;
  }

  /** An explicitly loaded remote snapshot is the new baseline. */
  markLoaded(boardId: string): void {
    if (this.tails.has(boardId)) {
      throw new Error('画板仍在保存，暂时不能替换画板快照');
    }
    this.savedRevisions.set(boardId, this.getRevision(boardId));
    this.failures.delete(boardId);
  }

  save(
    boardId: string,
    revision: number,
    write: () => Promise<void>
  ): Promise<void> {
    const previous = this.tails.get(boardId) || Promise.resolve();
    const operation = previous
      .catch(() => undefined)
      .then(write)
      .then(
        () => {
          this.savedRevisions.set(
            boardId,
            Math.max(revision, this.savedRevisions.get(boardId) || 0)
          );
          const failure = this.failures.get(boardId);
          if (failure && failure.revision <= revision)
            this.failures.delete(boardId);
        },
        (error: unknown) => {
          this.failures.set(boardId, { revision, error });
          throw error;
        }
      );
    this.tails.set(boardId, operation);
    this.pending.add(operation);
    // Observe rejection without converting the returned promise into success.
    void operation.then(
      () => this.finish(boardId, operation),
      () => this.finish(boardId, operation)
    );
    return operation;
  }

  private finish(boardId: string, operation: Promise<void>): void {
    this.pending.delete(operation);
    if (this.tails.get(boardId) === operation) this.tails.delete(boardId);
  }

  async waitForPending(): Promise<void> {
    while (this.pending.size > 0) {
      await Promise.all([...this.pending]);
    }
    const failure = this.failures.values().next().value;
    if (failure) throw failure.error;
  }
}

/** Embedded iframe/React tools have no common draft persistence contract yet. */
export function hasEmbeddedBoardTool(elements: readonly unknown[]): boolean {
  const pending = [...elements];
  const seen = new Set<object>();
  while (pending.length > 0) {
    const item = pending.pop();
    if (!item || typeof item !== 'object' || seen.has(item)) continue;
    seen.add(item);
    const element = item as { type?: unknown; children?: unknown };
    if (element.type === 'tool') return true;
    if (Array.isArray(element.children)) pending.push(...element.children);
  }
  return false;
}
