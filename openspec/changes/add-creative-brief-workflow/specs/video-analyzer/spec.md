## ADDED Requirements

### Requirement: Popular Video Creative Brief
The popular video tool SHALL persist an optional creative brief on the existing product/script configuration and use it when rewriting scripts.

#### Scenario: Rewrite script with creative brief
- **WHEN** the user sets purpose/scene, directing style, narrative style, or advanced brief fields and starts AI script rewrite
- **THEN** the rewrite prompt includes the selected brief
- **AND** the returned script is instructed to adapt hook, selling structure, pacing, narration density, and CTA to the brief

#### Scenario: Choose a purpose or scene preset
- **WHEN** the user opens the professional creative brief editor
- **THEN** the popular video tool SHALL provide grouped purpose and scene presets such as conversion, local lifestyle, knowledge/tutorial, story/emotion, brand, and music/MV directions
- **AND** the selected purpose or scene SHALL be persisted and included in rewrite, frame, and video generation prompts

#### Scenario: Open old record without brief
- **WHEN** the user opens a record created before creative brief support
- **THEN** the script page loads without errors
- **AND** all creative brief fields are treated as empty defaults
