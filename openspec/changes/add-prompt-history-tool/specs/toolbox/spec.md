## ADDED Requirements

### Requirement: Prompt History Toolbox Tool
The system SHALL provide a built-in toolbox tool named "提示词历史" that opens as an internal React tool.

#### Scenario: User opens prompt history from toolbox
- **WHEN** the user opens the toolbox
- **THEN** the "提示词历史" tool is available as a content tool
- **AND** opening it shows local prompt history records derived from generation tasks

### Requirement: Prompt History Tool Uses Lightweight Records
The prompt history tool SHALL read only lightweight task summaries for list rendering and result previews.

#### Scenario: Large media tasks exist
- **WHEN** prompt history records are loaded
- **THEN** the list data excludes large uploaded media, analysis payloads, tool call arrays, and full generated media blobs
- **AND** media previews reference existing URLs or thumbnails
