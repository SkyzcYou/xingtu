## Context

Video analyzer, MV creator, and music analyzer each own their page routing and domain-specific task interpretation, but they duplicate workflow shell lifecycle code.

## Decisions

- Keep domain sync logic in each workflow's existing `task-sync.ts`.
- Share only the thin shell concerns:
  - step rendering and disabled step behavior
  - step/history/starred navigation shell rendering
  - page and history/starred navigation actions
  - record list/current record/starred UI state
  - completed task scan, subscription, in-flight de-dupe, and unmount cleanup
- Keep storage keys, record schemas, task metadata, provider routing, media execution, and service worker behavior unchanged.

## Failure Modes

- Task sync handlers may throw; the shared hook logs the failure and releases the in-flight task id.
- Task sync may finish after unmount; the shared hook drops late results.
- Record loading may fail or return bad data; the shared record hook falls back to an empty list without changing storage.
