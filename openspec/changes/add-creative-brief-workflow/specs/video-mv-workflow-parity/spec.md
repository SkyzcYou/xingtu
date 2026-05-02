## ADDED Requirements

### Requirement: Shared Creative Brief Controls
The system SHALL provide the same lightweight creative brief controls for the MV creator and popular video tool.

#### Scenario: Configure shared brief fields
- **WHEN** the user opens the script/config area for either workflow
- **THEN** the user can set purpose/scene, directing style, and narrative style as primary controls
- **AND** platform, audience, pacing, and avoid terms are available as advanced controls

#### Scenario: Persist shared brief fields
- **WHEN** the user changes creative brief fields in either workflow
- **THEN** the fields are saved on the existing workflow record
- **AND** the values are restored when the record is reopened

### Requirement: MV Storyboard Prompt Uses Visual Context
The MV creator SHALL pass selected visual style and aspect ratio into initial storyboard prompt generation.

#### Scenario: Generate storyboard with style and ratio
- **WHEN** the user generates an MV storyboard with selected video style or aspect ratio
- **THEN** the storyboard prompt includes those visual constraints
