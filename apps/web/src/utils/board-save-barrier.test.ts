import { describe, expect, it, vi } from 'vitest';
import { BoardSaveBarrier, hasEmbeddedBoardTool } from './board-save-barrier';

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('BoardSaveBarrier', () => {
  it('does not replace a board baseline until its in-flight write has finished', async () => {
    const barrier = new BoardSaveBarrier();
    const write = deferred();
    const saved = barrier.save(
      'board',
      barrier.markDirty('board'),
      () => write.promise
    );
    expect(() => barrier.markLoaded('board')).toThrow('仍在保存');
    write.resolve();
    await saved;
    barrier.markLoaded('board');
    expect(barrier.isDirty('board')).toBe(false);
  });

  it('waits for the latest revision and does not clear dirty state after an older save', async () => {
    const barrier = new BoardSaveBarrier();
    const first = deferred();
    const second = deferred();
    const a = barrier.save(
      'board',
      barrier.markDirty('board'),
      () => first.promise
    );
    const writeSecond = vi.fn(() => second.promise);
    const b = barrier.save('board', barrier.markDirty('board'), writeSecond);
    let flushed = false;
    const flush = barrier.waitForPending().then(() => {
      flushed = true;
    });
    first.resolve();
    await a;
    expect(barrier.isDirty('board')).toBe(true);
    expect(flushed).toBe(false);
    await Promise.resolve();
    expect(writeSecond).toHaveBeenCalledOnce();
    second.resolve();
    await b;
    await flush;
    expect(barrier.isDirty('board')).toBe(false);
  });

  it('retains save failures and only clears them after a newer successful write', async () => {
    const barrier = new BoardSaveBarrier();
    const failure = new Error('disk full');
    await expect(
      barrier.save('board', barrier.markDirty('board'), async () => {
        throw failure;
      })
    ).rejects.toThrow(failure);
    expect(barrier.hasFailure()).toBe(true);
    await expect(barrier.waitForPending()).rejects.toThrow(failure);
    await barrier.save(
      'board',
      barrier.markDirty('board'),
      async () => undefined
    );
    await expect(barrier.waitForPending()).resolves.toBeUndefined();
    expect(barrier.hasFailure()).toBe(false);
  });

  it('includes a write queued while the flush is already waiting', async () => {
    const barrier = new BoardSaveBarrier();
    const first = deferred();
    const second = deferred();
    const a = barrier.save(
      'one',
      barrier.markDirty('one'),
      () => first.promise
    );
    let done = false;
    const flush = barrier.waitForPending().then(() => {
      done = true;
    });
    const b = barrier.save(
      'two',
      barrier.markDirty('two'),
      () => second.promise
    );
    first.resolve();
    await a;
    expect(done).toBe(false);
    second.resolve();
    await b;
    await flush;
    expect(done).toBe(true);
  });
});


describe('embedded board tool update veto', () => {
  it('finds iframe and internal tool nodes inside nested groups', () => {
    expect(hasEmbeddedBoardTool([{ type: 'tool', url: 'https://external.example' }])).toBe(true);
    expect(hasEmbeddedBoardTool([{ type: 'group', children: [{ type: 'tool', component: 'knowledge-base' }] }])).toBe(true);
    expect(hasEmbeddedBoardTool([{ type: 'text', text: 'tool' }, { type: 'image' }])).toBe(false);
  });

  it('handles malformed or cyclic board payloads without blocking the safety check', () => {
    const group: any = { type: 'group', children: [] };
    group.children.push(group, null, 1);
    expect(hasEmbeddedBoardTool([group])).toBe(false);
    group.children.push({ type: 'tool' });
    expect(hasEmbeddedBoardTool([group])).toBe(true);
  });
});
