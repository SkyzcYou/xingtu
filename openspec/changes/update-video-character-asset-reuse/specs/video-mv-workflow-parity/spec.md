## ADDED Requirements

### Requirement: Shared Subject Asset Category
The system SHALL support reusable subject assets in the asset library for video workflows.

#### Scenario: Filter reusable subject assets
- **GIVEN** the asset library contains subject assets and ordinary image assets
- **WHEN** the user opens a subject asset picker from a supported video workflow
- **THEN** the picker SHALL prioritize assets categorized as subjects
- **AND** it SHALL still allow ordinary image assets to be selected as a fallback

#### Scenario: Mark image as subject
- **GIVEN** the user selects an image asset in the asset library
- **WHEN** the user chooses to set it as a subject
- **THEN** the system SHALL require a subject name separate from the asset title
- **AND** it SHALL persist the subject category and lightweight subject metadata for future reuse

#### Scenario: Preserve lightweight asset references
- **WHEN** a subject asset is selected for a workflow character
- **THEN** the workflow record SHALL persist only lightweight subject fields and image URL references
- **AND** it SHALL NOT persist image binaries, base64 payloads, or full asset objects in the workflow record

### Requirement: Shared Script Page Subject Asset Selection
The system SHALL let users select asset-library subject materials from both the MV creator script page and the video analyzer script page.

#### Scenario: Select subject asset in MV creator script page
- **GIVEN** the user is editing a character on the MV creator script page
- **WHEN** the user selects a subject asset from the asset library
- **THEN** the editor SHALL populate `name`, `description`, and `referenceImageUrl` from the selected asset
- **AND** the populated values SHALL be persisted with the MV workflow record

#### Scenario: Select subject asset in video analyzer script page
- **GIVEN** the user is editing a detected character on the video analyzer script page
- **WHEN** the user selects a subject asset from the asset library
- **THEN** the editor SHALL populate `name`, `description`, and `referenceImageUrl` from the selected asset
- **AND** the populated values SHALL be persisted with the video analyzer record

#### Scenario: Use ordinary image fallback
- **GIVEN** the user is editing a character in either supported script page
- **WHEN** the user selects an ordinary image asset instead of a subject asset
- **THEN** the character editor SHALL populate `referenceImageUrl` from the image asset
- **AND** it SHALL populate `name` when a title or filename can be inferred
- **AND** it SHALL preserve any existing user-edited `description` unless the image asset explicitly provides one

### Requirement: Shared Step Three Subject Reference Preview
The system SHALL show selected subject reference images in step 3 of both MV creator and video analyzer generation flows.

#### Scenario: Reflect selected reference image in step 3
- **GIVEN** a workflow character has a `referenceImageUrl` populated from a selected asset
- **WHEN** the user reaches step 3 of the generation flow
- **THEN** the step SHALL display that character reference image with the character identity
- **AND** the displayed image SHALL match the image reference used when submitting generation

#### Scenario: Handle unavailable reference image
- **GIVEN** a workflow character has an unavailable or unreadable `referenceImageUrl`
- **WHEN** the user reaches step 3 of the generation flow
- **THEN** the step SHALL render the remaining character information without blocking the page
- **AND** it SHALL allow the user to replace or clear the reference image
