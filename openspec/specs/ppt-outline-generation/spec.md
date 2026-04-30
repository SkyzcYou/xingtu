# ppt-outline-generation Specification

## Purpose
TBD - created by archiving change update-ppt-outline-generation-flow. Update Purpose after archive.
## Requirements
### Requirement: PPT Outline Mode
The system SHALL provide a PPT editor outline mode that shows a shared prompt field and editable per-slide prompt fields.

#### Scenario: User reviews generated prompts
- **WHEN** a generated PPT contains placeholder slide frames
- **THEN** the PPT editor can switch between slide thumbnail mode and outline mode
- **AND** outline mode shows one shared prompt field above all slide prompt fields
- **AND** every slide prompt row includes a checkbox for generation selection

### Requirement: Outline-First PPT Skill
The system SHALL make the built-in complete PPT Skill generate prompts and placeholder slides before image generation.

#### Scenario: User runs the complete PPT Skill
- **WHEN** the user runs `generate_ppt`
- **THEN** the tool creates PPT frames containing shared style metadata and per-slide prompts
- **AND** no slide image task is submitted automatically
- **AND** the project drawer opens to PPT editor outline mode

### Requirement: Controlled PPT Slide Generation
The system SHALL generate only selected PPT slides from outline mode using either serial or parallel execution.

#### Scenario: Serial selected-slide generation
- **WHEN** the user selects serial generation
- **THEN** slides generate one at a time in page order
- **AND** each slide after the first uses the previous successfully generated slide image as a reference image

#### Scenario: Parallel selected-slide generation
- **WHEN** the user selects parallel generation
- **THEN** slides generate without reference images
- **AND** at most five slide image tasks are in flight at once

