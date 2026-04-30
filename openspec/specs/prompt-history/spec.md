# prompt-history Specification

## Purpose
TBD - created by archiving change add-prompt-history-tool. Update Purpose after archive.
## Requirements
### Requirement: Prompt Lineage History
The system SHALL derive prompt history records from task queue data and connect initial prompt, sent prompt, tags, and generated result preview.

#### Scenario: New task has prompt metadata
- **WHEN** a generation task is created from AI input
- **THEN** the task stores lightweight prompt metadata with initial prompt, sent prompt, category, and optional Skill identifiers

#### Scenario: Old task has no prompt metadata
- **WHEN** an older task is shown in prompt history
- **THEN** the initial prompt falls back to `sourcePrompt`, then `rawInput`, then `prompt`
- **AND** the sent prompt falls back to `prompt`

### Requirement: Prompt History Filtering
The prompt history tool SHALL support filtering by image, video, audio, text, and Agent categories, with optional Skill tag filtering.

#### Scenario: User filters prompt records
- **WHEN** the user selects a category, Skill tag, or search query
- **THEN** the tool shows only matching prompt history records in reverse chronological order

### Requirement: Prompt Hover Details
Prompt list items SHALL optionally show prompt titles in the list while keeping sent prompt as the selectable content.

#### Scenario: User hovers a prompt history item
- **WHEN** the prompt history item has sent prompt, tags, or result preview data
- **THEN** the hover tip shows the sent prompt, tags, and a lightweight result preview

