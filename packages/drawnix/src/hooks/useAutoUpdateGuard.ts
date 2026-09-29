import { useEffect, useRef } from 'react';
import { autoUpdateSafety } from '../services/auto-update-safety';

/** Keep the participant stable while always reading the latest component state. */
export function useAutoUpdateGuard(
  id: string,
  busyReason: string | null,
  flush?: () => Promise<void>,
  cancel?: () => void
): void {
  const latest = useRef({ busyReason, flush, cancel });
  latest.current = { busyReason, flush, cancel };
  useEffect(
    () =>
      autoUpdateSafety.registerParticipant(id, {
        getBlockReason: () => latest.current.busyReason,
        flush: async () => {
          await latest.current.flush?.();
        },
        cancel: () => latest.current.cancel?.(),
      }),
    [id]
  );
}
