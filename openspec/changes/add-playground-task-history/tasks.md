## 1. Database and authenticated API

- [x] 1.1 Add an additive migration for account-scoped Playground history with task kind/status constraints and newest-first indexes.
- [x] 1.2 Add validated Rust request/response types for text and image history records; reject malformed kind-specific parameters/results and binary/base64 image payloads.
- [x] 1.3 Add authenticated create and bounded newest-first list endpoints with strict account isolation.
- [ ] 1.4 Add backend tests for text/image success, failed attempts, pagination, validation, and cross-account isolation. Unit coverage is complete; database-backed cross-account verification remains.

## 2. Playground history recording

- [x] 2.1 Add frontend API types/functions for creating and listing Playground history records.
- [x] 2.2 Record settled text attempts with prompt, model, System Prompt settings, result/error, and client-observed duration.
- [x] 2.3 Record settled synchronous and asynchronous image attempts with prompt, model, size, mode, reference file names, URL-only results/job ids, error, and duration.
- [x] 2.4 Keep generation success/error primary when history synchronization fails, and surface the history sync issue separately.

## 3. History UI and confirmed replay

- [x] 3.1 Add a Playground-only newest-first history section with loading, empty, error, success/failure, timestamps, duration, prompt, and result previews.
- [x] 3.2 Add bounded pagination/load-more behavior without fetching unbounded history.
- [x] 3.3 Add text replay that switches tabs, refills text parameters, clears stale output/error state, and does not auto-submit.
- [x] 3.4 Add image replay that switches tabs, refills image parameters, clears stale output/error state, and does not auto-submit.
- [x] 3.5 For reference-image history, show prior file names and require file reselection before the normal submit action.
- [x] 3.6 Add unavailable-image fallback behavior for expired result URLs.

## 4. Validation

- [x] 4.1 Run Rust formatting and targeted backend tests/checks.
- [x] 4.2 Run backend-web TypeScript/typecheck/build validation.
- [ ] 4.3 Exercise text success/failure, sync image, async image, history load-more, replay-without-submit, and reference-file reselection in the running Playground.
- [ ] 4.4 Verify the same account sees records across sessions/devices and another account cannot retrieve them. Blocked locally because `DATABASE_URL` is not configured.
- [x] 4.5 Validate this change with `openspec validate add-playground-task-history --strict` when the OpenSpec CLI is available; document the unavailable-tool blocker otherwise. OpenSpec CLI was unavailable on 2026-07-15.
