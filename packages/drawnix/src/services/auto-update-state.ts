export interface AutoUpdateStatus {
  version: string;
  phase: 'waiting' | 'countdown' | 'preparing' | 'updating' | 'blocked';
  remainingSeconds?: number;
  reason?: string;
  overdue: boolean;
  draining?: boolean;
  canPostpone: boolean;
}

let status: AutoUpdateStatus | null = null;
const listeners = new Set<() => void>();

export function getAutoUpdateStatus(): AutoUpdateStatus | null {
  return status;
}

export function subscribeAutoUpdateStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAutoUpdateStatus(next: AutoUpdateStatus | null): void {
  if (JSON.stringify(status) === JSON.stringify(next)) return;
  status = next;
  for (const listener of listeners) listener();
}
