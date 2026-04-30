# Change: Add complete environment backup and restore

## Why
Recent features store durable user data outside the original backup domains, so restoring a backup can lose tasks, PPT preferences, chats, playlists, skills, model preferences, and selected environment settings.

## What Changes
- Add a v4 backup format with complete backup/replace restore semantics while preserving existing incremental import.
- Add an environment backup domain for whitelisted localStorage, KV storage, IndexedDB store snapshots, and optional password-encrypted secrets.
- Make task backup independent from asset backup and persist restored tasks to IndexedDB.
- Expand prompt backup to all prompt types, deleted prompt records, and prompt history overrides.
- Add UI controls for complete backup, environment data, optional encrypted secrets, and merge vs replace restore.

## Impact
- Affected specs: backup-restore
- Affected code:
  - `packages/drawnix/src/services/backup-restore/*`
  - `packages/drawnix/src/components/backup-restore/*`
  - storage services for tasks, workspace, prompts, chats, playlists, settings, and environment data
  - `apps/web/public/sw-debug/shared/*` for shared constants/types compatibility
