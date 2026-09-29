# Verification

## Automated checks

- Web update policy, page/worker coordination, board save barrier, critical asset closure, and existing shell/media tests: **88 passed**.
- Drawnix safety, admission, failed-write retry, draft persistence/restore, streaming, hydration, protected editors/tools, and related existing task/insertion tests: **197 passed**.
- Both web and drawnix TypeScript checks: passed.
- Production web and Service Worker builds: passed.
- Startup dependency/budget validation: passed; no chunk cycles. Both newly fetched and previously cached HTML must carry the expected app-version before update readiness is accepted.
- OpenSpec strict validation and git diff whitespace checks: passed.

## Browser integration

A temporary local fixture imported the actual page coordinator, safety service and worker coordinator. Two real browser tabs were controlled by a v1 worker, then a v2 worker was installed.

- A busy peer vetoed an update requested from the other tab; both stayed on v1.
- A rejected draft save vetoed activation; both stayed on v1.
- After both pages became idle, the 10-second countdown completed without an update click.
- Both pages loaded v2 exactly once (load count 1 → 2).
- Both pages retained their distinct input drafts.
- The final production bundle was opened locally with Service Worker enabled; the workbench, toolbar and AI input mounted successfully.

The fixture used synthetic work and draft contents, not production boards, API keys or paid generation requests.

## Deliberate first-stage limits

- Existing legacy clients that cannot vote block automatic takeover. Use the existing manual update once or close all old tabs to migrate; no forced remote navigation.
- Task submission/streaming/upload/import/export stays on the current page until finished; an update never resubmits a paid request.
- Blob-only/oversized/unserializable input, quota failures, save failures, unresponsive tabs, unsaved settings, unknown editors and minimized tools defer automatic updating.
- A current board containing embedded tools also defers updating; save the tool's content and switch boards first. Unknown iframe state is not discarded.
- On activation timeout the page unlocks and accepts work; if the prepared worker takes control late, the page checks and saves again before reloading once.
- Old application caches are retired only after all live clients positively report the active release. Media and user data are not cleared.
