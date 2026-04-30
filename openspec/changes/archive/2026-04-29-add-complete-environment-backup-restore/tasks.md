## 1. Specification
- [x] 1.1 Add OpenSpec proposal, design, tasks, and backup-restore delta.
- [x] 1.2 Validate the OpenSpec change in strict mode.

## 2. Backup Format and Environment Domain
- [x] 2.1 Upgrade backup types and manifest to v4-compatible fields.
- [x] 2.2 Add environment export/import helpers with storage whitelists.
- [x] 2.3 Add password-based encrypted secrets export/import.

## 3. Data Completeness Fixes
- [x] 3.1 Export and import tasks independently from assets and persist restored tasks.
- [x] 3.2 Include all prompt types, deleted prompt contents, and prompt overrides.
- [x] 3.3 Support replace restore clearing for projects, assets, prompts, tasks, knowledge base, and environment domains.

## 4. UI
- [x] 4.1 Add complete/incremental backup controls and environment/secrets options.
- [x] 4.2 Add merge/replace restore controls, password input, warnings, and per-domain result output.

## 5. Verification
- [x] 5.1 Add unit tests for prompt metadata and environment encryption behavior.
- [x] 5.2 Run targeted tests and OpenSpec validation.
