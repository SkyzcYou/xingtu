## Context
The existing worker pins navigation to committedVersion and prewarms a pendingVersion. A per-page userConfirmedUpgrade flag is the only reload permission. The page owns media/workflow execution, while several drafts are memory-only. The source tree contains unrelated user changes which must be preserved.

## Decisions
- Keep staged caching; do not unconditionally switch HTML to network-first or call skipWaiting on update installation.
- Use a version-bound worker transaction: enumerate in-scope window clients, require every client to acknowledge a locked, persisted safe state, recheck membership and pending version, then commit. Missing, legacy, busy or failed-save clients veto. Abort releases all locks.
- Safety participants expose a busy reason and an awaited flush. Shared admission gating blocks new user operations after the 24-hour drain deadline or during a transaction. Existing work can finish.
- The inactivity and countdown policy is page-side, while the waiting worker arbitrates concurrent requests. Worker event lifetimes own bounded transactions; no infinite background timers are assumed.
- Refresh only after activation; bind the refresh to the accepted transaction and target release, with a per-tab once guard. On transaction timeout/failure remain on the old version and show a retryable state.
- Draft snapshots are tab-local and board-scoped. Never automatically commit provider credentials/configuration to save an unfinished settings form. Unpersistable drafts block the update.
- Automatic recovery does not resubmit generation requests. Retain existing task recovery contracts.
- Release readiness includes the actual startup imports and critical dynamic entry, not just the HTML shell. Keep unrelated optional tools out of the critical startup set.
- Preserve old static caches until clients have converged. User data/media caches are outside update cleanup.

## Migration and limits
Legacy open pages do not implement the new handshake and must veto automatic takeover. They can use the existing manual update or close all old tabs. Offline or failed persistence cannot be forced to latest. This phase waits for running work instead of handing off in-flight paid requests. Rollback across incompatible data schemas is outside scope.

Unregistered editors use conservative state-based vetoes until they expose a proven flush contract: standalone generation/diagram dialogs, inline text/link editors, image editing, backup/sync/account forms, knowledge-base editors, and open or minimized tool windows. Pinned launchers without a live window do not veto. An embedded `tool` node anywhere in the current board also vetoes, because its iframe or internal component can retain unsaved state outside the board record. The user can save tool contents and switch boards (also allowed during drain) before updating. Focus loss, minimization, or DOM invisibility are not evidence that editor data is saved.
