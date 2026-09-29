import {
  AUTO_UPDATE_COUNTDOWN_MS,
  AUTO_UPDATE_IDLE_MS,
  AUTO_UPDATE_MAX_DEFER_MS,
  AUTO_UPDATE_SNOOZE_MS,
} from '../../../../packages/drawnix/src/utils/auto-update-protocol';

/** Policy contains no browser APIs so clock, deferral and deadline races are testable. */
export class AutoUpdatePolicy {
  version: string | null = null;
  firstReadyAt: number | null = null;
  lastActivityAt: number;
  countdownEndsAt: number | null = null;
  postponedUntil = 0;
  private requestedNow = false;
  private hasInteracted = false;

  constructor(now: number) {
    this.lastActivityAt = now;
  }

  ready(version: string, firstReadyAt: number, now: number): void {
    if (this.version !== version) {
      this.countdownEndsAt = null;
      this.requestedNow = false;
    }
    this.version = version;
    this.firstReadyAt = Math.min(this.firstReadyAt ?? now, firstReadyAt, now);
  }

  clear(): void {
    this.version = null;
    this.firstReadyAt = null;
    this.countdownEndsAt = null;
    this.postponedUntil = 0;
    this.requestedNow = false;
  }

  isOverdue(now: number): boolean {
    return (
      this.firstReadyAt !== null &&
      now - this.firstReadyAt >= AUTO_UPDATE_MAX_DEFER_MS
    );
  }

  activity(now: number): void {
    this.hasInteracted = true;
    this.lastActivityAt = now;
    // The deadline prevents unbounded postponement, but never interrupts IME/drag.
    if (!this.isOverdue(now)) this.countdownEndsAt = null;
    this.requestedNow = false;
  }

  postpone(now: number): boolean {
    if (this.isOverdue(now)) return false;
    const deadline = (this.firstReadyAt ?? now) + AUTO_UPDATE_MAX_DEFER_MS;
    this.postponedUntil = Math.min(now + AUTO_UPDATE_SNOOZE_MS, deadline);
    this.countdownEndsAt = null;
    this.requestedNow = false;
    return true;
  }

  requestNow(): void {
    this.requestedNow = true;
    this.postponedUntil = 0;
    this.countdownEndsAt = null;
  }

  resetCountdown(): void {
    this.countdownEndsAt = null;
  }

  evaluate(
    now: number,
    blockReason: string | null
  ): {
    eligible: boolean;
    remainingSeconds?: number;
    reason?: string;
    overdue: boolean;
  } {
    const overdue = this.isOverdue(now);
    if (!this.version) return { eligible: false, overdue };
    if (blockReason) {
      this.countdownEndsAt = null;
      return { eligible: false, reason: blockReason, overdue };
    }
    if (!overdue && now < this.postponedUntil) {
      return { eligible: false, reason: '已稍后更新', overdue };
    }
    if (
      !overdue &&
      !this.requestedNow &&
      this.hasInteracted &&
      now - this.lastActivityAt < AUTO_UPDATE_IDLE_MS
    ) {
      this.countdownEndsAt = null;
      return { eligible: false, reason: '将在空闲时自动更新', overdue };
    }
    if (this.requestedNow)
      return { eligible: true, remainingSeconds: 0, overdue };
    this.countdownEndsAt ??= now + AUTO_UPDATE_COUNTDOWN_MS;
    const remainingSeconds = Math.max(
      0,
      Math.ceil((this.countdownEndsAt - now) / 1000)
    );
    return { eligible: remainingSeconds === 0, remainingSeconds, overdue };
  }
}
