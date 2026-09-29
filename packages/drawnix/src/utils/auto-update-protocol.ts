/** Plain messages shared by the page and the waiting worker; no runtime imports. */
export const AUTO_UPDATE_PROTOCOL = 1;
export const AUTO_UPDATE_IDLE_MS = 60_000;
export const AUTO_UPDATE_COUNTDOWN_MS = 10_000;
export const AUTO_UPDATE_MAX_DEFER_MS = 24 * 60 * 60 * 1000;
export const AUTO_UPDATE_SNOOZE_MS = 5 * 60 * 1000;
export const AUTO_UPDATE_TRANSACTION_MS = 15_000;

export interface AutoUpgradeMessage {
  type:
    | 'AUTO_UPGRADE_REQUEST'
    | 'AUTO_UPGRADE_PREPARE'
    | 'AUTO_UPGRADE_VOTE'
    | 'AUTO_UPGRADE_COMMIT'
    | 'AUTO_UPGRADE_ABORT'
    | 'AUTO_UPGRADE_CANCEL';
  protocol: typeof AUTO_UPDATE_PROTOCOL;
  version: string;
  requestId: string;
  ready?: boolean;
  reason?: string;
  currentVersion?: string;
}
