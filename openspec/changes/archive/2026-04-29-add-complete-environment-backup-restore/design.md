## Context
Backup/restore currently has fixed domains and incremental-only import. New features use `localStorage`, `aitu-storage`, `aitu-app`, `localforage` databases, and Cache Storage, so domain ownership must be explicit and restore must support clearing selected domains before import.

## Goals / Non-Goals
- Goals: complete environment backup, replace restore, encrypted secrets, full task persistence, full prompt metadata, and backward compatibility with v2/v3 ZIP files.
- Non-Goals: backing up crash logs, analytics buffers, transient preview caches, Service Worker failed-domain state, or arbitrary browser origin storage.

## Decisions
- Use backup v4 for complete backups and keep v2/v3 import support.
- Introduce an environment domain with a strict whitelist instead of dumping every browser storage key.
- Store normal environment data in `environment/data.json`; store sensitive settings in `environment/secrets.enc.json` only when the user provides a password.
- Implement replace restore by clearing selected durable domains before importing them, then reloading the workspace.
- Persist imported tasks with the task storage writer instead of only restoring in-memory task queue state.

## Risks / Trade-offs
- Risk: Cross-device restoration of existing encrypted settings cannot rely on the original device key.
  - Mitigation: decrypt current settings at export time and re-encrypt the secrets payload with the user-provided backup password.
- Risk: Large task/media histories can increase memory pressure.
  - Mitigation: read/write task and environment records in batches and avoid including transient caches.
- Risk: Old backups lack v4 environment files.
  - Mitigation: keep existing v2/v3 import behavior and treat missing v4 domains as skipped.

## Migration Plan
1. Add v4 types, validation helpers, and environment data service.
2. Update export to write v4 manifest fields and optional environment files.
3. Update import to accept `ImportOptions` and support merge/replace.
4. Update UI defaults and result reporting.
5. Add focused unit coverage for manifest compatibility, prompt metadata, encrypted secrets, and task persistence.
