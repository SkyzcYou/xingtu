/** One-tab, one-reload snapshots. They never submit a prompt or save provider settings. */
const DRAFT_KEY_PREFIX = 'aitu:auto-update-draft:v1:';
const MAX_SNAPSHOT_BYTES = 4 * 1024 * 1024;
const MAX_SNAPSHOT_AGE_MS = 24 * 60 * 60 * 1000;

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserSessionStorage(): DraftStorage {
  if (typeof window === 'undefined') throw new Error('无法保存刷新前草稿');
  return window.sessionStorage;
}

/** Blob URLs die with the current document. Refuse refresh instead of losing them. */
export function getNonDurableDraftReason(value: unknown): string | null {
  const seen = new Set<object>();
  const visit = (item: unknown): string | null => {
    if (typeof item === 'string' && /^blob:/i.test(item.trim())) {
      return '输入中有尚未持久化的附件，暂缓更新';
    }
    if (
      typeof item === 'function' ||
      typeof item === 'symbol' ||
      typeof item === 'bigint'
    ) {
      return '输入草稿包含无法恢复的内容，暂缓更新';
    }
    if (!item || typeof item !== 'object') return null;
    if (seen.has(item)) return '输入草稿包含循环引用，暂缓更新';
    if (
      !Array.isArray(item) &&
      Object.getPrototypeOf(item) !== Object.prototype &&
      Object.getPrototypeOf(item) !== null
    ) {
      return '输入中有尚未持久化的附件，暂缓更新';
    }
    seen.add(item);
    for (const child of Object.values(item)) {
      const reason = visit(child);
      if (reason) return reason;
    }
    seen.delete(item);
    return null;
  };
  return visit(value);
}

export function saveAutoUpdateDraft<T>(
  scope: string,
  draft: T,
  storage: DraftStorage = browserSessionStorage(),
  now = Date.now()
): void {
  if (!scope.trim()) throw new Error('草稿缺少画板或会话标识');
  const reason = getNonDurableDraftReason(draft);
  if (reason) throw new Error(reason);
  const serialized = JSON.stringify({ version: 1, scope, savedAt: now, draft });
  if (new Blob([serialized]).size > MAX_SNAPSHOT_BYTES) {
    throw new Error('输入草稿较大，尚未完成持久化，暂缓更新');
  }
  const key = DRAFT_KEY_PREFIX + scope;
  storage.setItem(key, serialized);
  if (storage.getItem(key) !== serialized)
    throw new Error('刷新前草稿未能完整保存');
}

export function readAutoUpdateDraft<T>(
  scope: string,
  validate: (value: unknown) => value is T,
  storage: DraftStorage = browserSessionStorage(),
  now = Date.now()
): T | null {
  const raw = storage.getItem(DRAFT_KEY_PREFIX + scope);
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw);
    if (
      envelope?.version !== 1 ||
      envelope.scope !== scope ||
      typeof envelope.savedAt !== 'number' ||
      !Number.isFinite(envelope.savedAt) ||
      envelope.savedAt > now + 60_000 ||
      now - envelope.savedAt > MAX_SNAPSHOT_AGE_MS ||
      !validate(envelope.draft) ||
      getNonDurableDraftReason(envelope.draft)
    )
      return null;
    return envelope.draft;
  } catch {
    return null;
  }
}

export function clearAutoUpdateDraft(
  scope: string,
  storage: DraftStorage = browserSessionStorage()
): void {
  storage.removeItem(DRAFT_KEY_PREFIX + scope);
}
