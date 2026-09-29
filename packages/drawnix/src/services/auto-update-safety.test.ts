import { describe, expect, it, vi } from 'vitest';
import { AutoUpdateSafety, UpdateInProgressError } from './auto-update-safety';

function readySafety() {
  const safety = new AutoUpdateSafety();
  safety.setAppReady(true);
  return safety;
}

describe('update persistence and admission boundary', () => {
  it('blocks admission synchronously before awaiting a save and holds the lock until abort/activation', async () => {
    const safety = readySafety();
    let finish!: () => void;
    const flush = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    safety.registerParticipant('board', { getBlockReason: () => null, flush });
    const preparation = safety.prepare('transaction');
    expect(() => safety.beginOperation('new task')).toThrow(
      UpdateInProgressError
    );
    await vi.waitFor(() => expect(flush).toHaveBeenCalled());
    finish();
    await expect(preparation).resolves.toEqual({ ready: true });
    expect(safety.isLocked()).toBe(true);
    safety.release('another-transaction');
    expect(safety.isLocked()).toBe(true);
    safety.release('transaction');
    expect(safety.isLocked()).toBe(false);
  });

  it('aborts a failed save without pretending work is durable', async () => {
    const safety = readySafety();
    safety.registerParticipant('draft', {
      getBlockReason: () => null,
      flush: async () => {
        throw new Error('quota exceeded');
      },
    });
    await expect(safety.prepare('a')).resolves.toEqual({
      ready: false,
      reason: 'quota exceeded',
    });
    expect(safety.isLocked()).toBe(false);
  });

  it('vetoes active uploads and does not invoke their flush', async () => {
    const safety = readySafety();
    const done = safety.beginOperation('上传中');
    const flush = vi.fn();
    safety.registerParticipant('board', { getBlockReason: () => null, flush });
    await expect(safety.prepare('a')).resolves.toEqual({
      ready: false,
      reason: '上传中',
    });
    expect(flush).not.toHaveBeenCalled();
    done();
    await expect(safety.prepare('b')).resolves.toEqual({ ready: true });
  });

  it('allows already admitted work to drain but never to cross a commit lock', async () => {
    const safety = readySafety();
    safety.setDraining(true);
    expect(() => safety.beginOperation('new task')).toThrow(
      UpdateInProgressError
    );
    const done = safety.beginOperation('existing workflow child', {
      allowDuringDrain: true,
    });
    done();
    await safety.prepare('a');
    expect(() =>
      safety.beginOperation('child', { allowDuringDrain: true })
    ).toThrow(UpdateInProgressError);
  });

  it('rejects a changing set of persistence owners while saving', async () => {
    const safety = readySafety();
    safety.registerParticipant('board', {
      getBlockReason: () => null,
      flush: async () => {
        safety.registerParticipant('new-editor', {
          getBlockReason: () => null,
        });
      },
    });
    await expect(safety.prepare('a')).resolves.toMatchObject({ ready: false });
    expect(safety.isLocked()).toBe(false);
  });

  it('rechecks busy state after saving and fails closed during startup', async () => {
    const safety = new AutoUpdateSafety();
    await expect(safety.prepare('startup')).resolves.toEqual({
      ready: false,
      reason: '正在恢复工作台',
    });
    safety.setAppReady(true);
    let busy = false;
    safety.registerParticipant('editor', {
      getBlockReason: () => (busy ? 'input changed' : null),
      flush: async () => {
        busy = true;
      },
    });
    await expect(safety.prepare('a')).resolves.toEqual({
      ready: false,
      reason: 'input changed',
    });
  });
});

describe('cancelled upgrade snapshots', () => {
  it('cleans snapshots after abort and after an outstanding flush completes', async () => {
    const safety = readySafety();
    let finishSave!: () => void;
    const cancel = vi.fn();
    const flush = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        })
    );
    safety.registerParticipant('draft', {
      getBlockReason: () => null,
      flush,
      cancel,
    });
    const pending = safety.prepare('a');
    await vi.waitFor(() => expect(flush).toHaveBeenCalled());
    safety.release('a');
    expect(cancel).toHaveBeenCalledOnce();
    await expect(safety.prepare('b')).resolves.toMatchObject({ ready: false });
    finishSave();
    await expect(pending).resolves.toMatchObject({ ready: false });
    expect(cancel).toHaveBeenCalledTimes(2);
  });
});
