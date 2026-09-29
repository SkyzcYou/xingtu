import {
  AUTO_UPDATE_PROTOCOL,
  AUTO_UPDATE_TRANSACTION_MS,
  type AutoUpgradeMessage,
} from '../../../../packages/drawnix/src/utils/auto-update-protocol';
import { AutoUpdatePolicy } from './auto-update-policy';
import type { AutoUpdateSafety } from '../../../../packages/drawnix/src/services/auto-update-safety';
import type { AutoUpdateStatus } from '../../../../packages/drawnix/src/services/auto-update-state';

export interface UpgradeWorker {
  postMessage(message: unknown): void;
  state?: string;
}

export interface AutomaticUpdateVersionState {
  committedVersion: string;
  pendingVersion: string | null;
  pendingReadyAt: number | null;
  firstPendingReadyAt?: number | null;
  upgradeState: string;
  autoUpdateProtocol?: number;
  swVersion?: string;
}

interface Dependencies {
  currentVersion: string;
  safety: AutoUpdateSafety;
  getWaitingWorker: () => Promise<UpgradeWorker | null>;
  getController: () => UpgradeWorker | null;
  publish: (status: AutoUpdateStatus | null) => void;
  reload: () => void;
  now?: () => number;
  online?: () => boolean;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
}

interface Transaction {
  requestId: string;
  version: string;
  worker: UpgradeWorker;
  committed: boolean;
  timer: ReturnType<typeof setTimeout>;
}

const RELOAD_KEY = 'xingtu-auto-update-reload';
const POSTPONE_KEY = 'xingtu-auto-update-postpone';

function updateBlockReason(reason?: string): string {
  const messages: Record<string, string> = {
    'upgrade-in-progress': '另一个页面正在协调更新',
    'version-not-ready': '新版资源尚未准备完成',
    'client-timeout': '有页面尚未响应，暂缓更新',
    'client-not-ready': '其他页面尚未准备完成',
    'client-unreachable': '无法确认其他页面状态，暂缓更新',
    'clients-changed': '打开的页面发生变化，稍后重试',
    'requester-gone': '发起更新的页面已关闭',
    'prepare-failed': '更新准备失败，已保留当前版本',
    'commit-failed': '新版接管失败，稍后重试',
    'client-cancelled': '页面正在操作，稍后更新',
    'manual-upgrade': '正在处理手动更新',
  };
  return reason ? messages[reason] || reason : '等待所有页面准备完成';
}

/** Page half of the all-client upgrade protocol. The waiting worker owns arbitration. */
export class AutoUpdateCoordinator {
  readonly policy: AutoUpdatePolicy;
  private now: () => number;
  private transaction: Transaction | null = null;
  private request: {
    id: string;
    version: string;
    worker: UpgradeWorker;
    expiresAt: number;
  } | null = null;
  private checking = false;
  private retryAfter = 0;
  private reloaded = false;
  private lateTakeover: { version: string; worker: UpgradeWorker } | null =
    null;
  private composing = false;
  private pointers = new Set<number>();
  private sequence = 0;
  private reason: string | null = null;
  private deferredVersionState: AutomaticUpdateVersionState | null = null;
  private detach: (() => void) | null = null;

  constructor(private readonly deps: Dependencies) {
    this.now = deps.now || Date.now;
    this.policy = new AutoUpdatePolicy(this.now());
    try {
      const previous = deps.storage?.getItem(RELOAD_KEY);
      // Successfully booted the selected release: consume the once-only reload marker.
      if (previous === deps.currentVersion) {
        deps.storage?.removeItem(RELOAD_KEY);
        deps.storage?.removeItem(POSTPONE_KEY);
      }
      this.policy.postponedUntil =
        Number(deps.storage?.getItem(POSTPONE_KEY)) || 0;
    } catch {
      /* Storage restrictions do not authorize an unsafe reload. */
    }
  }

  handleVersionState(state: AutomaticUpdateVersionState): void {
    if (state.autoUpdateProtocol !== AUTO_UPDATE_PROTOCOL) return;
    if (
      state.pendingVersion &&
      state.pendingVersion !== this.deps.currentVersion &&
      state.upgradeState === 'ready'
    ) {
      if (
        this.transaction &&
        this.transaction.version !== state.pendingVersion
      ) {
        this.deferredVersionState = state;
        this.cancel('发现了更新的版本，重新准备');
        return;
      }
      if (this.policy.version !== state.pendingVersion) {
        this.retryAfter = 0;
        this.reason = null;
      }
      if (
        this.lateTakeover &&
        (this.lateTakeover.worker.state === 'installed' ||
          this.lateTakeover.worker.state === 'redundant' ||
          this.lateTakeover.version !== state.pendingVersion)
      ) {
        this.lateTakeover = null;
      }
      const since = state.firstPendingReadyAt ?? state.pendingReadyAt;
      if (typeof since !== 'number' || !Number.isFinite(since)) return;
      this.policy.ready(state.pendingVersion, since, this.now());
      void this.tick();
    } else if (
      !state.pendingVersion &&
      state.committedVersion === this.deps.currentVersion &&
      !this.transaction
    ) {
      this.policy.clear();
      this.deps.safety.setDraining(false);
      this.deps.publish(null);
    }
    // Activation can precede controllerchange. Only a prepared client may reload.
    if (
      this.transaction?.committed &&
      state.committedVersion === this.transaction.version
    ) {
      this.controllerChanged();
    }
  }

  activity(): void {
    this.policy.activity(this.now());
    if (this.transaction && !this.transaction.committed)
      this.cancel('用户正在操作，稍后更新');
  }

  requestNow(): void {
    this.policy.requestNow();
    this.retryAfter = 0;
    void this.tick();
  }

  postpone(): void {
    if (this.transaction?.committed) return;
    if (this.policy.postpone(this.now())) {
      this.cancel('已稍后更新');
      try {
        this.deps.storage?.setItem(
          POSTPONE_KEY,
          String(this.policy.postponedUntil)
        );
      } catch {
        /* optional */
      }
      void this.tick();
    }
  }

  private online(): boolean {
    return this.deps.online?.() !== false;
  }

  private interactionBlockReason(): string | null {
    if (!this.online()) return '离线中，联网后自动更新';
    if (this.composing || this.pointers.size > 0) return '正在输入或拖动画布';
    return null;
  }

  private async blockReason(): Promise<string | null> {
    return (
      this.interactionBlockReason() || (await this.deps.safety.getBlockReason())
    );
  }

  async tick(): Promise<void> {
    if (
      this.checking ||
      !this.policy.version ||
      this.transaction ||
      this.reloaded
    )
      return;
    this.checking = true;
    try {
      const now = this.now();
      this.deps.safety.setDraining(
        !this.lateTakeover && this.online() && this.policy.isOverdue(now)
      );
      if (this.request && now >= this.request.expiresAt) {
        this.request = null;
        this.reason = '等待其他页面确认超时，稍后重试';
        this.retryAfter = now + 10_000;
      }
      const decision = this.policy.evaluate(now, await this.blockReason());
      if (!this.policy.version || this.transaction) return;
      this.deps.publish({
        version: this.policy.version,
        phase: decision.reason
          ? 'waiting'
          : this.reason && now < this.retryAfter
          ? 'blocked'
          : 'countdown',
        remainingSeconds: decision.remainingSeconds,
        reason:
          decision.reason ||
          (now < this.retryAfter ? this.reason || undefined : undefined),
        overdue: decision.overdue,
        draining: this.deps.safety.isDraining(),
        canPostpone: !decision.overdue,
      });
      if (!decision.eligible || this.request || now < this.retryAfter) return;
      if (this.lateTakeover) {
        if (this.deps.getController() === this.lateTakeover.worker) {
          await this.recoverLateTakeover();
          return;
        }
        const replacement = await this.deps.getWaitingWorker();
        if (
          this.lateTakeover.worker.state === 'redundant' ||
          (replacement &&
            replacement !== this.lateTakeover.worker &&
            replacement.state !== 'redundant')
        ) {
          this.lateTakeover = null;
        } else return;
      }
      const worker = await this.deps.getWaitingWorker();
      if (
        !worker ||
        worker === this.deps.getController() ||
        worker.state === 'redundant'
      )
        return;
      const version = this.policy.version;
      if (
        !version ||
        this.transaction ||
        !this.policy.evaluate(this.now(), await this.blockReason()).eligible
      )
        return;
      const id = `${this.now()}-${++this.sequence}-${Math.random()
        .toString(36)
        .slice(2)}`;
      this.request = {
        id,
        version,
        worker,
        expiresAt: this.now() + AUTO_UPDATE_TRANSACTION_MS + 5000,
      };
      worker.postMessage({
        type: 'AUTO_UPGRADE_REQUEST',
        protocol: AUTO_UPDATE_PROTOCOL,
        requestId: id,
        version,
      } satisfies AutoUpgradeMessage);
    } finally {
      this.checking = false;
    }
  }

  async handleMessage(
    message: AutoUpgradeMessage,
    worker: UpgradeWorker
  ): Promise<void> {
    if (
      message.protocol !== AUTO_UPDATE_PROTOCOL ||
      !message.requestId ||
      !message.version
    )
      return;
    if (message.type === 'AUTO_UPGRADE_PREPARE') {
      // An old client, an unprepared release or another worker cannot opt this page into a refresh.
      if (
        message.version !== this.policy.version ||
        worker === this.deps.getController()
      )
        return;
      const waiting = await this.deps.getWaitingWorker();
      if (waiting !== worker || worker.state === 'redundant') return;
      if (this.transaction) return;
      const checkedReason = await this.blockReason();
      // An async participant can yield to new input even after the drain deadline.
      const decision = this.policy.evaluate(
        this.now(),
        this.interactionBlockReason() || checkedReason
      );
      if (!decision.eligible) {
        worker.postMessage({
          ...message,
          type: 'AUTO_UPGRADE_VOTE',
          ready: false,
          reason: decision.reason || '另一个页面正在等待更新倒计时',
          currentVersion: this.deps.currentVersion,
        });
        return;
      }
      const transaction: Transaction = {
        requestId: message.requestId,
        version: message.version,
        worker,
        committed: false,
        timer: setTimeout(() => {
          if (this.transaction === transaction && !transaction.committed) {
            this.cancel('更新确认超时，保留当前版本');
            this.release(transaction);
          }
        }, AUTO_UPDATE_TRANSACTION_MS + 5000),
      };
      this.transaction = transaction;
      this.publishTransaction('preparing');
      let vote = await this.deps.safety.prepare(message.requestId);
      if (this.transaction !== transaction) return;
      const interactionReason = this.interactionBlockReason();
      if (vote.ready && interactionReason)
        vote = { ready: false, reason: interactionReason };
      worker.postMessage({
        ...message,
        type: 'AUTO_UPGRADE_VOTE',
        ...vote,
        currentVersion: this.deps.currentVersion,
      });
      if (!vote.ready) this.release(transaction, vote.reason);
      return;
    }
    const transaction = this.transaction;
    if (message.type === 'AUTO_UPGRADE_ABORT') {
      if (
        transaction &&
        transaction.requestId === message.requestId &&
        transaction.worker === worker
      ) {
        this.release(transaction, message.reason);
      } else if (
        this.request?.id === message.requestId &&
        this.request.worker === worker
      ) {
        this.request = null;
        this.reason = updateBlockReason(message.reason);
        this.retryAfter = this.now() + 10_000;
      }
      return;
    }
    if (
      message.type === 'AUTO_UPGRADE_COMMIT' &&
      transaction &&
      transaction.requestId === message.requestId &&
      transaction.version === message.version &&
      transaction.worker === worker &&
      this.deps.safety.isLocked()
    ) {
      transaction.committed = true;
      clearTimeout(transaction.timer);
      this.publishTransaction('updating');
      this.controllerChanged();
      // Activation failure is bounded. Do not leave the UI permanently locked.
      transaction.timer = setTimeout(() => {
        if (this.transaction === transaction && !this.reloaded) {
          this.lateTakeover = {
            version: transaction.version,
            worker: transaction.worker,
          };
          this.release(
            transaction,
            '新版尚未接管，可以继续工作，接管后再安全更新'
          );
          this.deps.safety.setDraining(false);
        }
      }, 30_000);
    }
  }

  private async recoverLateTakeover(): Promise<void> {
    const target = this.lateTakeover;
    if (
      !target ||
      this.transaction ||
      this.deps.getController() !== target.worker
    )
      return;
    const reason = await this.blockReason();
    if (
      !this.policy.evaluate(this.now(), this.interactionBlockReason() || reason)
        .eligible
    )
      return;
    const id = `late-${this.now()}-${++this.sequence}`;
    const tx: Transaction = {
      requestId: id,
      version: target.version,
      worker: target.worker,
      committed: false,
      timer: setTimeout(
        () => this.release(tx, '保存确认超时，稍后重试'),
        AUTO_UPDATE_TRANSACTION_MS
      ),
    };
    this.transaction = tx;
    this.publishTransaction('preparing');
    const vote = await this.deps.safety.prepare(id);
    if (this.transaction !== tx) return;
    const interaction = this.interactionBlockReason();
    if (
      !vote.ready ||
      interaction ||
      this.deps.getController() !== target.worker
    ) {
      this.release(tx, vote.reason || interaction || '版本状态已变化');
      return;
    }
    tx.committed = true;
    this.publishTransaction('updating');
    this.controllerChanged();
  }

  controllerChanged(): void {
    if (this.lateTakeover && !this.transaction) {
      void this.tick();
      return;
    }
    const tx = this.transaction;
    if (
      !tx?.committed ||
      this.reloaded ||
      this.deps.getController() !== tx.worker
    )
      return;
    try {
      if (this.deps.storage?.getItem(RELOAD_KEY) === tx.version) {
        this.release(tx, '更新后仍未进入目标版本，请手动刷新检查');
        this.retryAfter = Number.POSITIVE_INFINITY;
        return;
      }
      this.deps.storage?.setItem(RELOAD_KEY, tx.version);
    } catch {
      /* in-memory guard still prevents duplicate activation callbacks */
    }
    this.reloaded = true;
    clearTimeout(tx.timer);
    this.deps.reload();
  }

  private publishTransaction(phase: 'preparing' | 'updating'): void {
    if (!this.transaction) return;
    this.deps.publish({
      version: this.transaction.version,
      phase,
      overdue: this.policy.isOverdue(this.now()),
      draining: this.deps.safety.isDraining(),
      canPostpone: false,
    });
  }

  private cancel(reason: string): void {
    const tx = this.transaction;
    if (tx && !tx.committed) {
      tx.worker.postMessage({
        type: 'AUTO_UPGRADE_CANCEL',
        protocol: AUTO_UPDATE_PROTOCOL,
        version: tx.version,
        requestId: tx.requestId,
        reason,
      } satisfies AutoUpgradeMessage);
      // Keep the input fence until the worker aborts; it may already be committing.
    }
  }

  private release(tx: Transaction, reason?: string): void {
    if (this.transaction !== tx) return;
    clearTimeout(tx.timer);
    this.deps.safety.release(tx.requestId);
    this.transaction = null;
    this.request = null;
    this.reason = updateBlockReason(reason);
    this.retryAfter = this.now() + 10_000;
    this.policy.resetCountdown();
    this.deps.publish({
      version: tx.version,
      phase: 'blocked',
      reason: this.reason,
      overdue: this.policy.isOverdue(this.now()),
      draining: this.deps.safety.isDraining(),
      canPostpone: !this.policy.isOverdue(this.now()),
    });
    if (this.deferredVersionState) {
      const pending = this.deferredVersionState;
      this.deferredVersionState = null;
      this.handleVersionState(pending);
    }
  }

  start(): () => void {
    const onActivity = (event: Event) => {
      const element = event.target instanceof Element ? event.target : null;
      if (
        element?.closest(
          '[data-auto-update-ui], .version-update-prompt__dialog'
        )
      )
        return;
      if (event.type === 'compositionstart') this.composing = true;
      if (event.type === 'compositionend') this.composing = false;
      if (event.type === 'pointerdown')
        this.pointers.add((event as PointerEvent).pointerId);
      if (this.deps.safety.isLocked()) {
        if (event.cancelable) event.preventDefault();
        event.stopImmediatePropagation();
        if (!this.transaction?.committed) this.cancel('检测到操作，稍后更新');
        return;
      }
      this.activity();
    };
    const onPointerUp = (event: PointerEvent) => {
      this.pointers.delete(event.pointerId);
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'SW_VERSION_STATE') this.handleVersionState(data);
      if (
        typeof data.type === 'string' &&
        data.type.startsWith('AUTO_UPGRADE_') &&
        event.source
      ) {
        void this.handleMessage(data, event.source as ServiceWorker);
      }
    };
    const onController = () => this.controllerChanged();
    const onNow = () => this.requestNow();
    const onPostpone = () => this.postpone();
    const events = [
      'pointerdown',
      'click',
      'keydown',
      'beforeinput',
      'input',
      'wheel',
      'compositionstart',
      'compositionend',
      'paste',
      'drop',
    ];
    for (const event of events)
      window.addEventListener(event, onActivity, {
        capture: true,
        passive: false,
      });
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerUp, true);
    window.addEventListener('auto-update-now', onNow);
    window.addEventListener('auto-update-postpone', onPostpone);
    navigator.serviceWorker.addEventListener('message', onMessage);
    navigator.serviceWorker.addEventListener('controllerchange', onController);
    const interval = setInterval(() => {
      void this.tick();
    }, 1000);
    this.detach = () => {
      clearInterval(interval);
      for (const event of events)
        window.removeEventListener(event, onActivity, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);
      window.removeEventListener('auto-update-now', onNow);
      window.removeEventListener('auto-update-postpone', onPostpone);
      navigator.serviceWorker.removeEventListener('message', onMessage);
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        onController
      );
      if (this.transaction) this.release(this.transaction, '页面已离开');
    };
    return this.detach;
  }

  dispose(): void {
    this.detach?.();
    this.detach = null;
    if (this.transaction) this.release(this.transaction);
  }
}
