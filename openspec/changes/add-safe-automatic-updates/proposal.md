# Change: Automatically install prepared updates at a safe boundary

## Why
Users who never click the update prompt can keep a committed local release indefinitely. The user approved implementation of the first-stage design in this conversation: preserve local-first/offline operation while automatically switching prepared releases without interrupting editing or paid generation.

## What Changes
- Check on startup, reconnect, visibility return, and periodically; prepare a complete startup dependency set before advertising readiness.
- Automatically count down after 60 seconds of inactivity, then switch after 10 seconds; retain manual update and bounded postponement.
- Persist the first-ready time across reloads and newer pending releases; after 24 hours stop admitting new long tasks and drain existing work.
- Coordinate all in-scope clients through a fail-closed prepare/commit transaction. Await persistence, block new operations during commit, and reload each prepared tab once after activation.
- Preserve board and input drafts; defer on unpersistable work, unknown clients, active tasks, uploads, streams, imports or exports.
- Retain old static caches while old or unknown clients exist; never clear user media or documents to update.

## Impact
- Affected specs: automatic-updates (new), release-safe-static-loading.
- Affected code: web bootstrap, worker lifecycle/precache, update UI, persistence participants, task admission.
- Existing legacy pages still require the existing update action or natural activation after all old clients close. Do not forcibly navigate them.
- No deployment, schema migration, API retry, or task resubmission is included.
