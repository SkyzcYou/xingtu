## ADDED Requirements

### Requirement: Generation Prompts Inherit Creative Brief
Single-shot and batch video generation prompts SHALL inherit the workflow creative brief when present.

#### Scenario: Generate shot video with creative brief
- **GIVEN** a workflow record has a creative brief
- **WHEN** the user generates a single shot video or starts batch video generation
- **THEN** each video prompt includes the relevant directing, pacing, platform, audience, and avoid constraints

#### Scenario: Empty creative brief keeps existing behavior
- **GIVEN** a workflow record has no creative brief
- **WHEN** the user generates frames or videos
- **THEN** prompt output remains compatible with the existing prompt structure
