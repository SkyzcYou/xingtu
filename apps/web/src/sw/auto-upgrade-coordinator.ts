import {
  AUTO_UPDATE_PROTOCOL,
  AUTO_UPDATE_TRANSACTION_MS,
  type AutoUpgradeMessage,
} from '../../../../packages/drawnix/src/utils/auto-update-protocol';

export interface UpgradeClient {
  id: string;
  url: string;
  postMessage(message: AutoUpgradeMessage): void;
}

export interface UpgradeVersionState {
  committedVersion: string;
  pendingVersion: string | null;
  upgradeState: string;
  pendingCommitId?: string | null;
}

interface UpgradeCoordinatorOptions {
  version: string;
  scopeUrl: string;
  getClients(): Promise<readonly UpgradeClient[]>;
  getVersionState(): Promise<UpgradeVersionState>;
  /** Persist only intent, never the committed version. */
  stageCommit?(requestId: string): Promise<void>;
  abortCommit?(requestId: string): Promise<void>;
  /** Called synchronously after COMMIT is delivered, without an intervening await. */
  activate(): Promise<void>;
  timeoutMs?: number;
}

export interface UpgradeResult {
  committed: boolean;
  reason?: string;
}

interface UpgradeTransaction {
  message: AutoUpgradeMessage;
  requester: UpgradeClient;
  clients: Map<string, UpgradeClient>;
  votes: Map<string, string>;
  phase: 'enumerating' | 'preparing' | 'validating' | 'committing' | 'aborting';
  completion: Promise<UpgradeResult>;
  staging?: Promise<void>;
  finish(result: UpgradeResult): void;
  timer: ReturnType<typeof setTimeout>;
  deadlineAt: number;
}

export function isInUpgradeScope(
  client: Pick<UpgradeClient, 'url'>,
  scopeUrl: string
): boolean {
  try {
    const scope = new URL(scopeUrl);
    const url = new URL(client.url);
    return (
      url.origin === scope.origin && url.pathname.startsWith(scope.pathname)
    );
  } catch {
    return false;
  }
}

export function isAutoUpgradeMessage(
  value: unknown
): value is AutoUpgradeMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<AutoUpgradeMessage>;
  return (
    message.protocol === AUTO_UPDATE_PROTOCOL &&
    typeof message.version === 'string' &&
    message.version.length > 0 &&
    typeof message.requestId === 'string' &&
    message.requestId.length > 0 &&
    message.requestId.length <= 200 &&
    [
      'AUTO_UPGRADE_REQUEST',
      'AUTO_UPGRADE_PREPARE',
      'AUTO_UPGRADE_VOTE',
      'AUTO_UPGRADE_COMMIT',
      'AUTO_UPGRADE_ABORT',
      'AUTO_UPGRADE_CANCEL',
    ].includes(message.type || '')
  );
}

/** One waiting-worker transaction. Missing/legacy clients never count as ready. */
export class AutoUpgradeCoordinator {
  private active: UpgradeTransaction | null = null;

  constructor(private readonly options: UpgradeCoordinatorOptions) {}

  request(
    message: AutoUpgradeMessage,
    requester: UpgradeClient
  ): Promise<UpgradeResult> {
    if (
      !isAutoUpgradeMessage(message) ||
      message.type !== 'AUTO_UPGRADE_REQUEST' ||
      message.version !== this.options.version ||
      !isInUpgradeScope(requester, this.options.scopeUrl)
    ) {
      return Promise.resolve({ committed: false, reason: 'invalid-request' });
    }

    if (this.active) {
      if (this.active.message.requestId === message.requestId) {
        return this.active.completion;
      }
      // Reject only the new request: broadcasting here would unlock the live transaction.
      this.send(requester, {
        ...message,
        type: 'AUTO_UPGRADE_ABORT',
        reason: 'upgrade-in-progress',
      });
      return Promise.resolve({
        committed: false,
        reason: 'upgrade-in-progress',
      });
    }

    let finish!: (result: UpgradeResult) => void;
    const completion = new Promise<UpgradeResult>((resolve) => {
      finish = resolve;
    });
    const transaction: UpgradeTransaction = {
      message,
      requester,
      clients: new Map(),
      votes: new Map(),
      phase: 'enumerating',
      completion,
      finish,
      deadlineAt:
        Date.now() + (this.options.timeoutMs ?? AUTO_UPDATE_TRANSACTION_MS),
      timer: setTimeout(
        () => this.abort(transaction, 'client-timeout'),
        this.options.timeoutMs ?? AUTO_UPDATE_TRANSACTION_MS
      ),
    };
    this.active = transaction;
    void this.prepare(transaction).catch(() =>
      this.abort(transaction, 'prepare-failed')
    );
    return completion;
  }

  receive(message: AutoUpgradeMessage, sourceId: string): void {
    const transaction = this.active;
    if (
      !transaction ||
      !isAutoUpgradeMessage(message) ||
      message.version !== transaction.message.version ||
      message.requestId !== transaction.message.requestId ||
      transaction.phase === 'committing' ||
      transaction.phase === 'aborting'
    )
      return;
    if (!this.isCurrent(transaction)) return;
    if (
      !transaction.clients.has(sourceId) &&
      sourceId !== transaction.requester.id
    )
      return;

    if (message.type === 'AUTO_UPGRADE_CANCEL') {
      this.abort(transaction, message.reason || 'client-cancelled');
      return;
    }
    if (
      message.type !== 'AUTO_UPGRADE_VOTE' ||
      transaction.phase === 'enumerating' ||
      !transaction.clients.has(sourceId)
    )
      return;
    if (
      message.ready !== true ||
      typeof message.currentVersion !== 'string' ||
      !message.currentVersion
    ) {
      this.abort(transaction, message.reason || 'client-not-ready');
      return;
    }
    transaction.votes.set(sourceId, message.currentVersion);
    if (
      transaction.votes.size === transaction.clients.size &&
      transaction.phase === 'preparing'
    ) {
      transaction.phase = 'validating';
      void this.commit(transaction).catch(() =>
        this.abort(transaction, 'commit-failed')
      );
    }
  }

  private ready(state: UpgradeVersionState): boolean {
    return (
      state.pendingVersion === this.options.version &&
      state.upgradeState === 'ready'
    );
  }

  private async prepare(transaction: UpgradeTransaction): Promise<void> {
    const state = await this.options.getVersionState();
    if (!this.isCurrent(transaction)) return;
    if (!this.ready(state)) return this.abort(transaction, 'version-not-ready');

    const clients = (await this.options.getClients()).filter((client) =>
      isInUpgradeScope(client, this.options.scopeUrl)
    );
    if (!this.isCurrent(transaction)) return;
    transaction.clients = new Map(clients.map((client) => [client.id, client]));
    if (!transaction.clients.has(transaction.requester.id))
      return this.abort(transaction, 'requester-gone');

    transaction.phase = 'preparing';
    for (const client of clients) {
      if (
        !this.send(client, {
          ...transaction.message,
          type: 'AUTO_UPGRADE_PREPARE',
        })
      ) {
        return this.abort(transaction, 'client-unreachable');
      }
    }
  }

  private async commit(transaction: UpgradeTransaction): Promise<void> {
    const clients = (await this.options.getClients()).filter((client) =>
      isInUpgradeScope(client, this.options.scopeUrl)
    );
    if (!this.isCurrent(transaction)) return;
    const roster = new Set(clients.map((client) => client.id));
    if (
      roster.size !== transaction.clients.size ||
      [...roster].some((id) => !transaction.clients.has(id))
    ) {
      return this.abort(transaction, 'clients-changed');
    }
    const state = await this.options.getVersionState();
    if (!this.isCurrent(transaction)) return;
    if (!this.ready(state)) return this.abort(transaction, 'version-not-ready');

    transaction.staging = Promise.resolve(
      this.options.stageCommit?.(transaction.message.requestId)
    );
    await transaction.staging;
    if (!this.isCurrent(transaction)) return;
    // IndexedDB intent persistence yields; a tab may have opened during that write.
    const finalClients = (await this.options.getClients()).filter((client) =>
      isInUpgradeScope(client, this.options.scopeUrl)
    );
    if (!this.isCurrent(transaction)) return;
    const finalRoster = new Set(finalClients.map((client) => client.id));
    if (
      finalRoster.size !== transaction.clients.size ||
      [...finalRoster].some((id) => !transaction.clients.has(id))
    ) {
      return this.abort(transaction, 'clients-changed');
    }
    const finalState = await this.options.getVersionState();
    if (!this.isCurrent(transaction)) return;
    if (
      finalState.pendingVersion !== this.options.version ||
      !(
        finalState.upgradeState === 'ready' ||
        (finalState.upgradeState === 'committing' &&
          finalState.pendingCommitId === transaction.message.requestId)
      )
    ) {
      return this.abort(transaction, 'version-not-ready');
    }
    transaction.phase = 'committing';
    for (const client of finalClients) {
      if (
        !this.send(client, {
          ...transaction.message,
          type: 'AUTO_UPGRADE_COMMIT',
        })
      ) {
        return this.abort(transaction, 'client-unreachable');
      }
    }
    // Pages remain locked until controllerchange/reload. Never promote shared
    // committedVersion here: the old active worker is still serving requests.
    await this.options.activate();
    if (!this.isCurrent(transaction)) return;
    clearTimeout(transaction.timer);
    this.active = null;
    transaction.finish({ committed: true });
  }

  private abort(transaction: UpgradeTransaction, reason: string): void {
    if (this.active !== transaction || transaction.phase === 'aborting') return;
    transaction.phase = 'aborting';
    clearTimeout(transaction.timer);
    const clients = new Map(transaction.clients);
    clients.set(transaction.requester.id, transaction.requester);
    for (const client of clients.values()) {
      this.send(client, {
        ...transaction.message,
        type: 'AUTO_UPGRADE_ABORT',
        reason,
      });
    }
    void Promise.resolve(transaction.staging)
      .catch(() => undefined)
      .then(() => this.options.abortCommit?.(transaction.message.requestId))
      .catch(() => undefined)
      .finally(() => {
        if (this.active === transaction) this.active = null;
        transaction.finish({ committed: false, reason });
      });
  }

  async cancel(reason: string): Promise<void> {
    const transaction = this.active;
    if (!transaction) return;
    this.abort(transaction, reason);
    await transaction.completion;
  }

  private isCurrent(transaction: UpgradeTransaction): boolean {
    if (this.active !== transaction || transaction.phase === 'aborting')
      return false;
    if (Date.now() >= transaction.deadlineAt) {
      this.abort(transaction, 'client-timeout');
      return false;
    }
    return true;
  }

  private send(client: UpgradeClient, message: AutoUpgradeMessage): boolean {
    try {
      client.postMessage(message);
      return true;
    } catch {
      return false;
    }
  }
}

/** Natural activation must not erase an even newer worker's pending state. */
export function activatedVersionPatch(
  state: UpgradeVersionState,
  version: string
) {
  if (state.pendingVersion && state.pendingVersion !== version) {
    return { committedVersion: version };
  }
  return {
    committedVersion: version,
    pendingVersion: null,
    pendingReadyAt: null,
    firstPendingReadyAt: null,
    pendingCommitId: null,
    upgradeState: 'idle' as const,
  };
}

export function hasExpiredAutoCommit(
  state: UpgradeVersionState & { updatedAt: number },
  version: string,
  now: number
): boolean {
  return (
    state.pendingVersion === version &&
    state.upgradeState === 'committing' &&
    Boolean(state.pendingCommitId) &&
    state.pendingCommitId !== 'legacy-manual' &&
    now - state.updatedAt >= AUTO_UPDATE_TRANSACTION_MS
  );
}

/** Carry the earliest waiting age across replaced workers; never extend it. */
export function earliestPendingReadyAt(
  state: {
    firstPendingReadyAt?: number | null;
    pendingReadyAt?: number | null;
  },
  readyAt: number
): number {
  return Math.min(
    readyAt,
    ...[state.firstPendingReadyAt, state.pendingReadyAt].filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value) && value > 0
    )
  );
}

/** Read the generated HTML marker without DOM APIs (unavailable in workers). */
export function appShellMatchesVersion(html: string, version: string): boolean {
  const markup = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const versions: string[] = [];
  for (const [tag] of markup.matchAll(
    /<meta\b(?:"[^"]*"|'[^']*'|[^"'>])*>/gi
  )) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(
      /([^\s"'=<>`]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
    )) {
      const name = match[1].toLowerCase();
      if (!attributes.has(name))
        attributes.set(name, match[2] ?? match[3] ?? match[4]);
    }
    if (attributes.get('name')?.toLowerCase() === 'app-version') {
      versions.push(attributes.get('content') || '');
    }
  }
  return version.length > 0 && versions.length === 1 && versions[0] === version;
}

export function validateCriticalPrecacheManifest(
  value: unknown,
  version: string
): Array<{ url: string; revision: string }> {
  const manifest = value as { version?: unknown; files?: unknown } | null;
  if (
    !manifest ||
    manifest.version !== version ||
    !Array.isArray(manifest.files) ||
    !manifest.files.length
  ) {
    throw new Error(
      'Critical precache manifest is missing or has a different version'
    );
  }
  const files = manifest.files as Array<{ url?: unknown; revision?: unknown }>;
  if (
    files.some(
      (file) =>
        !file ||
        typeof file.url !== 'string' ||
        !file.url.startsWith('/') ||
        file.url.startsWith('//') ||
        typeof file.revision !== 'string' ||
        !file.revision
    )
  ) {
    throw new Error('Critical precache manifest contains invalid entries');
  }
  if (
    !files.some((file) => file.url === '/index.html') ||
    !files.some(
      (file) => typeof file.url === 'string' && file.url.endsWith('.js')
    )
  ) {
    throw new Error(
      'Critical precache manifest is missing the application shell'
    );
  }
  return files as Array<{ url: string; revision: string }>;
}

/** Prune only after every live page identifies itself as the active release. */
export function obsoleteVersionCaches(
  cacheNames: string[],
  activeVersion: string,
  liveClientIds: readonly string[],
  clientVersions: ReadonlyMap<string, string>,
  pendingVersion: string | null = null
): string[] {
  if (liveClientIds.some((id) => clientVersions.get(id) !== activeVersion))
    return [];
  const retainedVersions = new Set(
    [activeVersion, pendingVersion].filter(Boolean)
  );
  return cacheNames.filter((name) => {
    const prefix = name.startsWith('drawnix-static-v')
      ? 'drawnix-static-v'
      : name.startsWith('drawnix-v')
      ? 'drawnix-v'
      : null;
    return prefix !== null && !retainedVersions.has(name.slice(prefix.length));
  });
}
