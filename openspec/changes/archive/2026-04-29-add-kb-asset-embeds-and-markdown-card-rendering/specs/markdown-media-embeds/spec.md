## ADDED Requirements

### Requirement: 知识库 Markdown 编辑器必须支持素材库引用
The system SHALL allow users to insert media-library assets into knowledge-base markdown notes without duplicating media content into the note body.

#### Scenario: Insert an asset into a note
- **GIVEN** the user is editing a knowledge-base note
- **WHEN** the user opens the media library and selects an asset
- **THEN** the editor SHALL insert a markdown asset reference into the note content
- **AND** the inserted content SHALL preserve the referenced asset id

### Requirement: Markdown 渲染必须支持图片、视频、音频素材引用
The system SHALL resolve markdown asset references and render the referenced media inline in markdown preview surfaces.

#### Scenario: Render an image asset reference
- **GIVEN** a markdown body contains an `asset://` reference to an image asset
- **WHEN** the markdown is rendered in preview
- **THEN** the system SHALL display the referenced image inline

#### Scenario: Render a video or audio asset reference
- **GIVEN** a markdown body contains an `asset://` reference to a video or audio asset
- **WHEN** the markdown is rendered in preview
- **THEN** the system SHALL display an inline player for the referenced media

### Requirement: 画布 Markdown 卡片必须复用同一套素材渲染
The system SHALL render markdown asset references consistently in canvas markdown cards and in the knowledge-base editor preview.

#### Scenario: Display the same note content in a canvas card
- **GIVEN** a markdown body with media-library asset references is shown inside a canvas markdown card
- **WHEN** the card is rendered
- **THEN** the card SHALL display the same inline media presentation as the knowledge-base preview

### Requirement: 缺失素材必须有安全降级
The system SHALL replace unresolved markdown asset references with a visible placeholder instead of failing the render.

#### Scenario: Referenced asset has been deleted
- **GIVEN** a markdown body references an asset id that no longer exists
- **WHEN** the markdown is rendered
- **THEN** the system SHALL show a missing-asset placeholder in place of the media
