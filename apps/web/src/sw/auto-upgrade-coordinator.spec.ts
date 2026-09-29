import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AutoUpgradeCoordinator,
  appShellMatchesVersion,
  activatedVersionPatch,
  hasExpiredAutoCommit,
  earliestPendingReadyAt,
  obsoleteVersionCaches,
  validateCriticalPrecacheManifest,
  type UpgradeClient,
  type UpgradeVersionState,
} from './auto-upgrade-coordinator';
import {
  AUTO_UPDATE_PROTOCOL,
  type AutoUpgradeMessage,
} from '../../../../packages/drawnix/src/utils/auto-update-protocol';

const request: AutoUpgradeMessage = {
  type: 'AUTO_UPGRADE_REQUEST',
  protocol: AUTO_UPDATE_PROTOCOL,
  version: '2',
  requestId: 'upgrade-2',
  currentVersion: '1',
};
const vote = (
  overrides: Partial<AutoUpgradeMessage> = {}
): AutoUpgradeMessage => ({
  ...request,
  type: 'AUTO_UPGRADE_VOTE',
  ready: true,
  currentVersion: '1',
  ...overrides,
});
const flush = async () => {
  for (let i = 0; i < 15; i++) await Promise.resolve();
};
const client = (
  id: string,
  url = `https://app.test/app/?tab=${id}`
): UpgradeClient => ({
  id,
  url,
  postMessage: vi.fn(),
});
function fixture() {
  const a = client('a');
  const b = client('b');
  let clients = [a, b];
  let state: UpgradeVersionState = {
    committedVersion: '1',
    pendingVersion: '2',
    upgradeState: 'ready',
  };
  const events: string[] = [];
  const getClients = vi.fn(async () => clients);
  const stageCommit = vi.fn(async (id: string) => {
    events.push('stage');
    state = { ...state, upgradeState: 'committing', pendingCommitId: id };
  });
  const abortCommit = vi.fn(async (id: string) => {
    if (state.pendingCommitId === id)
      state = { ...state, upgradeState: 'ready', pendingCommitId: null };
  });
  const activate = vi.fn(async () => {
    events.push('activate');
  });
  const coordinator = new AutoUpgradeCoordinator({
    version: '2',
    scopeUrl: 'https://app.test/app/',
    getClients,
    getVersionState: async () => state,
    stageCommit,
    abortCommit,
    activate,
  });
  return {
    a,
    b,
    coordinator,
    activate,
    stageCommit,
    abortCommit,
    events,
    getClients,
    setClients: (next: UpgradeClient[]) => {
      clients = next;
    },
    setState: (next: UpgradeVersionState) => {
      state = next;
    },
    getState: () => state,
  };
}

afterEach(() => vi.useRealTimers());

describe('automatic upgrade vote transaction', () => {
  it('holds the request until every in-scope page votes, then commits to all before activation', async () => {
    const f = fixture();
    const completed = vi.fn();
    (f.a.postMessage as ReturnType<typeof vi.fn>).mockImplementation((m) => {
      if (m.type === 'AUTO_UPGRADE_COMMIT') f.events.push('commit-a');
    });
    (f.b.postMessage as ReturnType<typeof vi.fn>).mockImplementation((m) => {
      if (m.type === 'AUTO_UPGRADE_COMMIT') f.events.push('commit-b');
    });
    const result = f.coordinator.request(request, f.a).then(completed);
    await flush();
    f.coordinator.receive(vote(), 'a');
    await flush();
    expect(completed).not.toHaveBeenCalled();
    expect(f.activate).not.toHaveBeenCalled();
    f.coordinator.receive(vote(), 'b');
    await result;
    expect(completed).toHaveBeenCalledWith({ committed: true });
    expect(f.events).toEqual(['stage', 'commit-a', 'commit-b', 'activate']);
    expect(f.getState().committedVersion).toBe('1');
  });

  it('fails closed when a legacy or nonresponsive tab never votes', async () => {
    vi.useFakeTimers();
    const f = fixture();
    const result = f.coordinator.request(request, f.a);
    await flush();
    f.coordinator.receive(vote(), 'a');
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(result).resolves.toEqual({
      committed: false,
      reason: 'client-timeout',
    });
    expect(f.activate).not.toHaveBeenCalled();
    for (const page of [f.a, f.b])
      expect(page.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'AUTO_UPGRADE_ABORT' })
      );
  });

  it.each(['AUTO_UPGRADE_CANCEL', 'AUTO_UPGRADE_VOTE'] as const)(
    'aborts every participant on %s',
    async (type) => {
      const f = fixture();
      const result = f.coordinator.request(request, f.a);
      await flush();
      f.coordinator.receive(vote(), 'a');
      f.coordinator.receive(
        vote({ type, ready: false, reason: 'task-started' }),
        'b'
      );
      await expect(result).resolves.toEqual({
        committed: false,
        reason: 'task-started',
      });
      expect(f.activate).not.toHaveBeenCalled();
      expect(f.a.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'AUTO_UPGRADE_ABORT' })
      );
    }
  );

  it('rejects a second attempt without releasing or replacing the live transaction', async () => {
    const f = fixture();
    const result = f.coordinator.request(request, f.a);
    await flush();
    expect(f.coordinator.request(request, f.a)).toBe(result);
    expect(f.coordinator.request(request, f.b)).toBe(result);
    await expect(
      f.coordinator.request({ ...request, requestId: 'another' }, f.b)
    ).resolves.toEqual({ committed: false, reason: 'upgrade-in-progress' });
    expect(f.a.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'AUTO_UPGRADE_ABORT' })
    );
    f.coordinator.receive(vote(), 'a');
    f.coordinator.receive(vote(), 'b');
    await expect(result).resolves.toEqual({ committed: true });
  });

  it.each(['opened', 'closed'])(
    'aborts if a tab %s after the initial roster',
    async (change) => {
      const f = fixture();
      const result = f.coordinator.request(request, f.a);
      await flush();
      f.setClients(change === 'opened' ? [f.a, f.b, client('c')] : [f.a]);
      f.coordinator.receive(vote(), 'a');
      f.coordinator.receive(vote(), 'b');
      await expect(result).resolves.toEqual({
        committed: false,
        reason: 'clients-changed',
      });
      expect(f.activate).not.toHaveBeenCalled();
    }
  );

  it('rechecks the roster after the commit intent is persisted', async () => {
    const f = fixture();
    f.stageCommit.mockImplementation(async () => {
      f.setClients([f.a, f.b, client('c')]);
    });
    const result = f.coordinator.request(request, f.a);
    await flush();
    f.coordinator.receive(vote(), 'a');
    f.coordinator.receive(vote(), 'b');
    await expect(result).resolves.toEqual({
      committed: false,
      reason: 'clients-changed',
    });
    expect(f.activate).not.toHaveBeenCalled();
  });

  it('aborts when a newer waiting version supersedes the prepared version', async () => {
    const f = fixture();
    const result = f.coordinator.request(request, f.a);
    await flush();
    f.setState({
      committedVersion: '1',
      pendingVersion: '3',
      upgradeState: 'ready',
    });
    f.coordinator.receive(vote(), 'a');
    f.coordinator.receive(vote(), 'b');
    await expect(result).resolves.toEqual({
      committed: false,
      reason: 'version-not-ready',
    });
    expect(f.activate).not.toHaveBeenCalled();
  });

  it('does not count wrong-version, wrong-request, or unknown-client votes', async () => {
    vi.useFakeTimers();
    const f = fixture();
    const result = f.coordinator.request(request, f.a);
    await flush();
    f.coordinator.receive(vote(), 'a');
    f.coordinator.receive(vote({ version: '3' }), 'b');
    f.coordinator.receive(vote({ requestId: 'stale' }), 'b');
    f.coordinator.receive(vote(), 'unknown');
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(result).resolves.toEqual({
      committed: false,
      reason: 'client-timeout',
    });
    expect(f.activate).not.toHaveBeenCalled();
  });

  it('requires a matching ready state before asking any page to lock', async () => {
    const f = fixture();
    f.setState({
      committedVersion: '1',
      pendingVersion: '2',
      upgradeState: 'prewarming',
    });
    await expect(f.coordinator.request(request, f.a)).resolves.toEqual({
      committed: false,
      reason: 'version-not-ready',
    });
    expect(f.b.postMessage).not.toHaveBeenCalled();
  });

  it('does not coordinate outside its own registration scope', async () => {
    const f = fixture();
    f.setClients([
      f.a,
      client('outside', 'https://app.test/another/'),
      client('foreign', 'https://other.test/app/'),
    ]);
    const result = f.coordinator.request(request, f.a);
    await flush();
    f.coordinator.receive(vote(), 'a');
    await expect(result).resolves.toEqual({ committed: true });
  });

  it('rolls back a persisted intent when cancellation arrives during persistence', async () => {
    const f = fixture();
    let finishStage!: () => void;
    f.stageCommit.mockImplementation(
      (id) =>
        new Promise<void>((resolve) => {
          finishStage = () => {
            f.setState({
              committedVersion: '1',
              pendingVersion: '2',
              upgradeState: 'committing',
              pendingCommitId: id,
            });
            resolve();
          };
        })
    );
    const result = f.coordinator.request(request, f.a);
    await flush();
    f.coordinator.receive(vote(), 'a');
    f.coordinator.receive(vote(), 'b');
    await flush();
    f.coordinator.receive(vote({ type: 'AUTO_UPGRADE_CANCEL' }), 'b');
    finishStage();
    await expect(result).resolves.toEqual({
      committed: false,
      reason: 'client-cancelled',
    });
    expect(f.getState().upgradeState).toBe('ready');
    expect(f.activate).not.toHaveBeenCalled();
  });

  it('fails closed if persisting the commit intent fails', async () => {
    const f = fixture();
    f.stageCommit.mockRejectedValue(new Error('IndexedDB unavailable'));
    const result = f.coordinator.request(request, f.a);
    await flush();
    f.coordinator.receive(vote(), 'a');
    f.coordinator.receive(vote(), 'b');
    await expect(result).resolves.toEqual({
      committed: false,
      reason: 'commit-failed',
    });
    expect(f.activate).not.toHaveBeenCalled();
    expect(f.a.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'AUTO_UPGRADE_COMMIT' })
    );
  });

  it('rejects expired votes even if a suspended worker timer has not fired', async () => {
    vi.useFakeTimers();
    const f = fixture();
    const result = f.coordinator.request(request, f.a);
    await flush();
    vi.setSystemTime(Date.now() + 15_001);
    f.coordinator.receive(vote(), 'a');
    f.coordinator.receive(vote(), 'b');
    await expect(result).resolves.toEqual({
      committed: false,
      reason: 'client-timeout',
    });
    expect(f.activate).not.toHaveBeenCalled();
  });

  it('releases every lock if activation fails', async () => {
    const f = fixture();
    f.activate.mockRejectedValue(new Error('activation failed'));
    const result = f.coordinator.request(request, f.a);
    await flush();
    f.coordinator.receive(vote(), 'a');
    f.coordinator.receive(vote(), 'b');
    await expect(result).resolves.toEqual({
      committed: false,
      reason: 'commit-failed',
    });
    expect(f.a.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'AUTO_UPGRADE_ABORT' })
    );
    expect(f.getState().upgradeState).toBe('ready');
  });
});

describe('precache application shell version', () => {
  it.each([
    '<meta name="app-version" content="6.7.30">',
    "<meta content='6.7.30' name='app-version' />",
    '<META CONTENT="6.7.30" data-other="value" NAME="app-version">',
    '<meta\n content = "6.7.30"\n name = \'app-version\'>',
    '<meta name=app-version content=6.7.30 >',
  ])(
    'accepts the exact marker with varied quoting and attribute order',
    (html) => {
      expect(appShellMatchesVersion(html, '6.7.30')).toBe(true);
    }
  );

  it.each([
    '<meta name="app-version" content="6.7.31">',
    '<meta name="app-version">',
    '<meta name="description" content="6.7.30">',
    '<meta data-name="app-version" content="6.7.30">',
    '<!-- <meta name="app-version" content="6.7.30"> -->',
    '<script>const marker = \'<meta name="app-version" content="6.7.30">\';</script>',
    '<meta name="app-version" content="6.7.30"><meta name="app-version" content="6.7.31">',
    '<meta name="app-version" content="6.7.30',
  ])(
    'rejects mismatched, missing, duplicate, or non-markup markers',
    (html) => {
      expect(appShellMatchesVersion(html, '6.7.30')).toBe(false);
    }
  );
});

describe('readiness and retention safeguards', () => {
  it('promotes only the activated version without losing newer pending readiness', () => {
    expect(
      activatedVersionPatch(
        {
          committedVersion: '1',
          pendingVersion: '2',
          upgradeState: 'committing',
        },
        '2'
      )
    ).toMatchObject({
      committedVersion: '2',
      pendingVersion: null,
      firstPendingReadyAt: null,
      upgradeState: 'idle',
    });
    expect(
      activatedVersionPatch(
        {
          committedVersion: '1',
          pendingVersion: '3',
          upgradeState: 'prewarming',
        },
        '2'
      )
    ).toEqual({ committedVersion: '2' });
  });

  it('recovers an abandoned auto intent after restart, without resuming votes or changing manual intent', () => {
    const state = {
      committedVersion: '1',
      pendingVersion: '2',
      pendingCommitId: 'tx',
      upgradeState: 'committing',
      updatedAt: 100,
    };
    expect(hasExpiredAutoCommit(state, '2', 15_100)).toBe(true);
    expect(hasExpiredAutoCommit(state, '2', 1_000)).toBe(false);
    expect(hasExpiredAutoCommit(state, '3', 15_100)).toBe(false);
    expect(
      hasExpiredAutoCommit(
        { ...state, pendingCommitId: 'legacy-manual' },
        '2',
        15_100
      )
    ).toBe(false);
  });

  it('carries the oldest ready timestamp through replacement updates', () => {
    expect(
      earliestPendingReadyAt(
        { firstPendingReadyAt: 100, pendingReadyAt: 200 },
        300
      )
    ).toBe(100);
    expect(earliestPendingReadyAt({ pendingReadyAt: 200 }, 300)).toBe(200);
    expect(earliestPendingReadyAt({}, 300)).toBe(300);
    expect(earliestPendingReadyAt({ firstPendingReadyAt: NaN }, 300)).toBe(300);
  });

  it.each([
    null,
    {},
    { version: 'old', files: [] },
    { version: '2', files: [] },
    { version: '2', files: [{ url: '/index.html', revision: 'hash' }] },
    {
      version: '2',
      files: [
        { url: '/index.html', revision: 'hash' },
        { url: '//evil.test/a.js', revision: 'hash' },
      ],
    },
  ])(
    'rejects absent, mismatched, or incomplete essential manifests',
    (manifest) => {
      expect(() => validateCriticalPrecacheManifest(manifest, '2')).toThrow();
    }
  );

  it('accepts a versioned nonempty shell dependency manifest', () => {
    const files = [
      { url: '/index.html', revision: 'shell' },
      { url: '/assets/bootstrap-123.js', revision: 'boot' },
    ];
    expect(
      validateCriticalPrecacheManifest({ version: '2', files }, '2')
    ).toEqual(files);
  });

  it('keeps all old chunks for live/unknown clients and never prunes media', () => {
    const caches = [
      'drawnix-static-v1',
      'drawnix-static-v2',
      'drawnix-v1',
      'drawnix-v2',
      'drawnix-images',
      'drawnix-images-v0',
      'drawnix-fonts',
    ];
    expect(obsoleteVersionCaches(caches, '2', ['unknown'], new Map())).toEqual(
      []
    );
    expect(obsoleteVersionCaches(caches, '2', [], new Map())).toEqual([
      'drawnix-static-v1',
      'drawnix-v1',
    ]);
  });
  it('prunes only when all live pages explicitly report the active version', () => {
    const caches = [
      'drawnix-static-v1',
      'drawnix-static-v2',
      'drawnix-v1',
      'drawnix-v2',
    ];
    const current = new Map([
      ['a', '2'],
      ['b', '2'],
    ]);
    expect(obsoleteVersionCaches(caches, '2', ['a', 'b'], current)).toEqual([
      'drawnix-static-v1',
      'drawnix-v1',
    ]);
    expect(
      obsoleteVersionCaches(caches, '2', ['a', 'b', 'legacy'], current)
    ).toEqual([]);
    expect(
      obsoleteVersionCaches(
        caches,
        '2',
        ['a', 'b'],
        new Map([
          ['a', '2'],
          ['b', '1'],
        ])
      )
    ).toEqual([]);
  });

  it('preserves a newer waiting workers cache during reported-client cleanup', () => {
    const caches = [
      'drawnix-static-v1',
      'drawnix-static-v2',
      'drawnix-static-v3',
      'drawnix-v1',
      'drawnix-v2',
      'drawnix-v3',
      'drawnix-images',
      'drawnix-fonts',
    ];
    expect(
      obsoleteVersionCaches(caches, '2', ['a'], new Map([['a', '2']]), '3')
    ).toEqual(['drawnix-static-v1', 'drawnix-v1']);
  });
});
