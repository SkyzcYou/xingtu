## ADDED Requirements

### Requirement: Complete Environment Backup
The system SHALL support a complete backup mode that captures all durable user-facing environment data needed to restore the app to the backed-up state.

#### Scenario: Complete backup includes durable domains
- **GIVEN** the user has projects, assets, tasks, workflows, prompts, knowledge base content, chats, playlists, skills, model preferences, and UI preferences
- **WHEN** the user creates a complete backup
- **THEN** the backup SHALL include every selected durable domain
- **AND** the manifest SHALL record v4 schema metadata, selected domains, per-domain stats, and backup mode

### Requirement: Replace Restore
The system SHALL support replace restore for complete backups by clearing selected local domains before importing backup data.

#### Scenario: Replace restore mirrors the backup
- **GIVEN** the current browser has existing local data
- **AND** the user selects replace restore for a complete backup
- **WHEN** restore completes
- **THEN** selected domains SHALL match the backup content instead of being merged with previous local content
- **AND** the workspace SHALL reload and restore the backed-up current board when available

### Requirement: Encrypted Secrets
The system SHALL export sensitive configuration only when the user explicitly includes secrets and provides a backup password.

#### Scenario: Secrets require password
- **GIVEN** settings contain API keys, provider profiles, or sync credentials
- **WHEN** the user creates a backup without enabling secrets
- **THEN** sensitive values SHALL NOT be written to normal backup JSON
- **WHEN** the user enables secrets and provides a password
- **THEN** sensitive values SHALL be written only to an encrypted secrets payload

### Requirement: Full Task and Prompt Fidelity
The system SHALL include full terminal and archived generation history required by prompt history, media library, PPT, audio, and task queue views.

#### Scenario: Task and prompt data survives restore
- **GIVEN** completed or archived image, video, audio, PPT, text, and agent tasks exist
- **WHEN** the user backs up and restores data
- **THEN** restored task records SHALL be persisted to IndexedDB
- **AND** prompt preset settings SHALL include all supported prompt types, deleted prompt contents, and prompt overrides

### Requirement: Backward Compatibility
The system SHALL continue importing existing v2 and v3 backups.

#### Scenario: Legacy backups import incrementally
- **GIVEN** a valid v2 or v3 backup without environment files
- **WHEN** the user imports it
- **THEN** existing prompt, project, asset, task, and knowledge base import behavior SHALL continue to work
- **AND** missing v4 environment data SHALL be reported as skipped, not as a fatal error
