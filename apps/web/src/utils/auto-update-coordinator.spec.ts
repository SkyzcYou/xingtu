import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutoUpdateCoordinator } from './auto-update-coordinator';
import { AutoUpdateSafety } from '../../../../packages/drawnix/src/services/auto-update-safety';
import { AUTO_UPDATE_MAX_DEFER_MS } from '../../../../packages/drawnix/src/utils/auto-update-protocol';

function fixture() {
  let now = 1000;
  let online = true;
  const old = { postMessage: vi.fn(), state: 'activated' };
  const worker = { postMessage: vi.fn(), state: 'installed' };
  let controller = old;
  let waiting = worker;
  const safety = new AutoUpdateSafety();
  safety.setAppReady(true);
  const publish = vi.fn();
  const reload = vi.fn();
  const coordinator = new AutoUpdateCoordinator({
    currentVersion: 'v1',
    safety,
    getWaitingWorker: async () => waiting,
    getController: () => controller,
    publish,
    reload,
    now: () => now,
    online: () => online,
    storage: sessionStorage,
  });
  const ready = () =>
    coordinator.handleVersionState({
      committedVersion: 'v1',
      pendingVersion: 'v2',
      firstPendingReadyAt: 1000,
      pendingReadyAt: 1000,
      upgradeState: 'ready',
      autoUpdateProtocol: 1,
    });
  const message = (
    type: 'AUTO_UPGRADE_PREPARE' | 'AUTO_UPGRADE_COMMIT' | 'AUTO_UPGRADE_ABORT',
    requestId = 'a'
  ) =>
    coordinator.handleMessage(
      { type, version: 'v2', requestId, protocol: 1 },
      worker
    );
  return {
    coordinator,
    safety,
    worker,
    old,
    publish,
    reload,
    ready,
    message,
    time: (value: number) => {
      now = value;
    },
    offline: () => {
      online = false;
    },
    replaceWorker: (next: typeof worker) => {
      waiting = next;
    },
    activate: () => {
      controller = worker;
      coordinator.controllerChanged();
    },
  };
}

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('page automatic upgrade coordinator', () => {
  it('does not auto-commit a legacy worker', async () => {
    const f = fixture();
    f.coordinator.handleVersionState({
      committedVersion: 'v1',
      pendingVersion: 'v2',
      pendingReadyAt: 1000,
      upgradeState: 'ready',
    });
    await f.coordinator.tick();
    expect(f.worker.postMessage).not.toHaveBeenCalled();
    expect(f.coordinator.policy.version).toBeNull();
  });

  it('flushes before voting and reloads only after actual takeover, once', async () => {
    const f = fixture();
    const flush = vi.fn(async () => undefined);
    f.safety.registerParticipant('board', {
      getBlockReason: () => null,
      flush,
    });
    f.ready();
    f.coordinator.policy.requestNow();
    await f.message('AUTO_UPGRADE_PREPARE');
    expect(flush).toHaveBeenCalledOnce();
    expect(f.worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'AUTO_UPGRADE_VOTE', ready: true })
    );
    expect(f.safety.isLocked()).toBe(true);
    await f.message('AUTO_UPGRADE_COMMIT');
    expect(f.reload).not.toHaveBeenCalled();
    f.activate();
    f.activate();
    expect(f.reload).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem('xingtu-auto-update-reload')).toBe('v2');
    f.coordinator.dispose();
  });

  it('vetoes a failed save and ignores commit without a prepared lock', async () => {
    const f = fixture();
    f.safety.registerParticipant('draft', {
      getBlockReason: () => null,
      flush: async () => {
        throw new Error('cannot save draft');
      },
    });
    f.ready();
    f.coordinator.policy.requestNow();
    await f.message('AUTO_UPGRADE_PREPARE');
    expect(f.worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'AUTO_UPGRADE_VOTE',
        ready: false,
        reason: 'cannot save draft',
      })
    );
    await f.message('AUTO_UPGRADE_COMMIT');
    f.activate();
    expect(f.reload).not.toHaveBeenCalled();
    expect(f.safety.isLocked()).toBe(false);
  });

  it('checks every peer locally even when another tab requested immediate upgrade', async () => {
    const f = fixture();
    f.ready();
    f.coordinator.activity();
    await f.message('AUTO_UPGRADE_PREPARE');
    expect(f.worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'AUTO_UPGRADE_VOTE', ready: false })
    );
    expect(f.safety.isLocked()).toBe(false);
  });

  it('releases locks on abort and on an unresponsive transaction timeout', async () => {
    const f = fixture();
    f.ready();
    f.coordinator.policy.requestNow();
    await f.message('AUTO_UPGRADE_PREPARE');
    await f.message('AUTO_UPGRADE_ABORT');
    expect(f.safety.isLocked()).toBe(false);
    f.coordinator.policy.requestNow();
    await f.message('AUTO_UPGRADE_PREPARE', 'b');
    expect(f.safety.isLocked()).toBe(true);
    await vi.advanceTimersByTimeAsync(20_001);
    expect(f.safety.isLocked()).toBe(false);
    expect(f.reload).not.toHaveBeenCalled();
  });

  it('does not admit new work after the deadline, but offline use remains available', async () => {
    const f = fixture();
    f.ready();
    await vi.advanceTimersByTimeAsync(0);
    f.time(1000 + AUTO_UPDATE_MAX_DEFER_MS);
    await f.coordinator.tick();
    expect(f.safety.isDraining()).toBe(true);
    f.offline();
    await f.coordinator.tick();
    expect(f.safety.isDraining()).toBe(false);
    expect(f.publish).toHaveBeenLastCalledWith(
      expect.objectContaining({ reason: '离线中，联网后自动更新' })
    );
  });

  it('does not repeatedly refresh a page that failed to enter the target release', async () => {
    sessionStorage.setItem('xingtu-auto-update-reload', 'v2');
    const f = fixture();
    f.ready();
    f.coordinator.policy.requestNow();
    await f.message('AUTO_UPGRADE_PREPARE');
    await f.message('AUTO_UPGRADE_COMMIT');
    f.activate();
    expect(f.reload).not.toHaveBeenCalled();
    expect(f.safety.isLocked()).toBe(false);
    f.coordinator.dispose();
  });
});

describe('automatic update asynchronous interaction races', () => {
  it.each(['pointerdown', 'compositionstart'])(
    'vetoes %s arriving during a delayed check, even past the deadline',
    async (eventName) => {
      const original = Object.getOwnPropertyDescriptor(
        navigator,
        'serviceWorker'
      );
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: new EventTarget(),
      });
      const f = fixture();
      f.coordinator.policy.ready('v2', 1000, 1000);
      f.coordinator.policy.requestNow();
      f.time(1000 + AUTO_UPDATE_MAX_DEFER_MS);
      let finishCheck!: (reason: null) => void;
      f.safety.registerParticipant('delayed', {
        getBlockReason: () =>
          new Promise<null>((resolve) => {
            finishCheck = resolve;
          }),
      });
      f.coordinator.start();
      const preparation = f.message('AUTO_UPGRADE_PREPARE');
      await vi.advanceTimersByTimeAsync(0);
      const activity = new Event(eventName, {
        bubbles: true,
        cancelable: true,
      });
      Object.assign(activity, { pointerId: 1 });
      window.dispatchEvent(activity);
      finishCheck(null);
      await preparation;
      expect(f.worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AUTO_UPGRADE_VOTE',
          ready: false,
          reason: '正在输入或拖动画布',
        })
      );
      expect(f.safety.isLocked()).toBe(false);
      f.coordinator.dispose();
      if (original) Object.defineProperty(navigator, 'serviceWorker', original);
      else Reflect.deleteProperty(navigator, 'serviceWorker');
    }
  );

  it('records IME starting while fenced and rejects a positive vote after saving', async () => {
    const original = Object.getOwnPropertyDescriptor(
      navigator,
      'serviceWorker'
    );
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: new EventTarget(),
    });
    const f = fixture();
    f.coordinator.policy.ready('v2', 1000, 1000);
    f.coordinator.policy.requestNow();
    let finishSave!: () => void;
    f.safety.registerParticipant('draft', {
      getBlockReason: () => null,
      flush: () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        }),
    });
    f.coordinator.start();
    const preparation = f.message('AUTO_UPGRADE_PREPARE');
    await vi.advanceTimersByTimeAsync(0);
    expect(f.safety.isLocked()).toBe(true);
    window.dispatchEvent(new Event('compositionstart', { cancelable: true }));
    finishSave();
    await preparation;
    expect(f.worker.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'AUTO_UPGRADE_VOTE', ready: true })
    );
    expect(f.safety.isLocked()).toBe(false);
    f.coordinator.dispose();
    if (original) Object.defineProperty(navigator, 'serviceWorker', original);
    else Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('recovers a late controller takeover only after re-saving newer work', async () => {
    const f = fixture();
    let busy = false;
    const flush = vi.fn(async () => undefined);
    f.safety.registerParticipant('work', {
      getBlockReason: () => (busy ? 'new work' : null),
      flush,
    });
    f.coordinator.policy.ready('v2', 1000, 1000);
    f.coordinator.policy.requestNow();
    f.time(1000 + AUTO_UPDATE_MAX_DEFER_MS);
    await f.message('AUTO_UPGRADE_PREPARE');
    await f.message('AUTO_UPGRADE_COMMIT');
    await vi.advanceTimersByTimeAsync(30_001);
    expect(f.safety.isLocked()).toBe(false);
    expect(f.safety.isDraining()).toBe(false);
    busy = true;
    f.activate();
    await vi.advanceTimersByTimeAsync(0);
    expect(f.reload).not.toHaveBeenCalled();
    busy = false;
    f.time(50_000 + AUTO_UPDATE_MAX_DEFER_MS);
    await f.coordinator.tick();
    expect(flush).toHaveBeenCalledTimes(2);
    expect(f.reload).toHaveBeenCalledOnce();
    f.coordinator.dispose();
  });
});

describe('superseding a failed activation', () => {
  it('retries a replacement waiting worker after the old target becomes redundant', async () => {
    const f = fixture();
    f.coordinator.policy.ready('v2', 1000, 1000);
    f.coordinator.policy.requestNow();
    await f.message('AUTO_UPGRADE_PREPARE');
    await f.message('AUTO_UPGRADE_COMMIT');
    await vi.advanceTimersByTimeAsync(30_001);
    f.worker.state = 'redundant';
    const replacement = { postMessage: vi.fn(), state: 'installed' };
    f.replaceWorker(replacement);
    f.coordinator.handleVersionState({
      committedVersion: 'v1',
      pendingVersion: 'v3',
      pendingReadyAt: 20_000,
      firstPendingReadyAt: 1000,
      upgradeState: 'ready',
      autoUpdateProtocol: 1,
    });
    await vi.advanceTimersByTimeAsync(0);
    f.time(40_000);
    f.coordinator.policy.requestNow();
    await f.coordinator.tick();
    expect(replacement.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'AUTO_UPGRADE_REQUEST', version: 'v3' })
    );
    expect(f.reload).not.toHaveBeenCalled();
    f.coordinator.dispose();
  });
});
