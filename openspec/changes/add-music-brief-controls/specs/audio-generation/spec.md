## ADDED Requirements

### Requirement: Music Analyzer Song Positioning Brief
The system SHALL let the music analyzer collect a lightweight song positioning brief before lyric generation or rewrite, without creating a new workflow entity or audio generation modality.

#### Scenario: Create lyrics from a song brief
- **GIVEN** the user is creating a song from scratch in the music analyzer
- **WHEN** the user provides song positioning fields such as purpose, genre style, vocal style, energy mood, or lyric goal
- **THEN** the lyric generation prompt SHALL include those fields as upstream creative context
- **AND** the generated result SHALL still populate the existing title, style tags, and lyric draft fields

#### Scenario: Rewrite lyrics with a song brief
- **GIVEN** the user is rewriting an existing lyric draft in the music analyzer
- **WHEN** song positioning fields are present
- **THEN** the lyric rewrite prompt SHALL include those fields alongside the current lyrics and existing analysis
- **AND** the rewrite SHALL preserve the existing versioning behavior

#### Scenario: Restore legacy music records
- **GIVEN** a stored music analyzer record does not contain a song positioning brief
- **WHEN** the record is loaded
- **THEN** the system SHALL treat the missing brief as empty
- **AND** the record SHALL remain usable without migration errors

#### Scenario: Generate music from prepared lyrics
- **GIVEN** the user proceeds from lyrics to Suno music generation
- **WHEN** the record contains a song positioning brief
- **THEN** the system SHALL continue submitting only the existing Suno title, tags, lyric prompt, model version, and edit-action fields
- **AND** the brief SHALL not introduce new Suno submit fields
