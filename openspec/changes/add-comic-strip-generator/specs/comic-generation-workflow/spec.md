## ADDED Requirements

### Requirement: Comic Strip Generator Tool
The system SHALL provide an independent toolbox tool named "连环画生成" with the capability id `comic-generation-workflow`.

#### Scenario: Launch the comic strip generator
- **WHEN** the user opens the toolbox
- **THEN** the "连环画生成" tool SHALL be available as an internal tool
- **AND** opening it SHALL show a workspace for story input, prompt planning, page generation, history, and export actions

#### Scenario: Keep the tool independent from single-image generation
- **GIVEN** the user is using the comic strip generator
- **WHEN** the user creates or edits a comic project
- **THEN** the workflow SHALL keep project state, page list, history, and exports scoped to the comic tool
- **AND** it MAY reuse existing image provider/model routing without inserting intermediate pages into the single-image generation flow by default

### Requirement: Prompt Planning
The system SHALL plan comic prompts from user story input into editable shared prompt context and ordered page prompts.

#### Scenario: Create an initial prompt plan
- **GIVEN** the user enters a story idea, desired page count, style preferences, and image settings
- **WHEN** the user requests prompt planning
- **THEN** the system SHALL produce a project title, a shared prompt, and an ordered list of page prompts
- **AND** each page prompt SHALL include enough scene, character, action, and composition details to generate a standalone image

#### Scenario: Preserve edited prompt content during re-planning
- **GIVEN** the user has manually edited the shared prompt or locked one or more page prompts
- **WHEN** the user requests re-planning
- **THEN** the system SHALL preserve locked or manually protected content
- **AND** it SHALL update only the unlocked draft portions unless the user explicitly chooses to overwrite them

### Requirement: Shared And Per-Page Prompt Editing
The system SHALL allow users to edit the shared prompt and each per-page prompt before or after image generation.

#### Scenario: Edit shared prompt before generation
- **GIVEN** a comic project has a planned shared prompt
- **WHEN** the user edits the shared prompt
- **THEN** future page generation requests SHALL use the updated shared prompt combined with the current per-page prompt
- **AND** existing generated images SHALL remain unchanged until the user regenerates affected pages

#### Scenario: Edit a single page prompt
- **GIVEN** a comic project contains multiple pages
- **WHEN** the user edits one page prompt
- **THEN** the edit SHALL affect only that page's future generation request
- **AND** the user SHALL be able to regenerate that page without regenerating all other completed pages

#### Scenario: Reorder pages
- **GIVEN** a comic project contains ordered page prompts
- **WHEN** the user inserts, deletes, or reorders pages
- **THEN** the system SHALL maintain stable page ids for existing pages
- **AND** it SHALL update visible page numbering without losing existing prompts or result references

### Requirement: Serial And Parallel Image Generation
The system SHALL support both serial and parallel image generation modes for comic pages.

#### Scenario: Generate pages serially
- **GIVEN** the user selects serial generation
- **WHEN** the user starts generation
- **THEN** the system SHALL submit one page generation request at a time in page order
- **AND** it SHALL update each page status as queued, running, succeeded, failed, or cancelled

#### Scenario: Generate pages in parallel
- **GIVEN** the user selects parallel generation with a configured concurrency limit
- **WHEN** the user starts generation
- **THEN** the system SHALL submit no more than the configured number of page generation requests concurrently
- **AND** it SHALL keep pending pages queued until a running slot is available

#### Scenario: Retry or regenerate selected pages
- **GIVEN** one or more pages have failed or the user has edited their prompts
- **WHEN** the user retries or regenerates selected pages
- **THEN** the system SHALL submit only the selected pages
- **AND** completed pages outside the selection SHALL retain their result references

#### Scenario: Cancel pending generation
- **GIVEN** a comic generation queue is running
- **WHEN** the user cancels generation
- **THEN** the system SHALL stop submitting new page requests
- **AND** it SHALL preserve completed result references while marking unfinished pages as cancelled or failed according to their final task state

### Requirement: Lightweight History
The system SHALL persist lightweight comic project history that can restore editable projects without storing large image payloads.

#### Scenario: Save a comic project history record
- **WHEN** a comic project is created, edited, generated, or exported
- **THEN** the system SHALL save lightweight metadata including title, timestamps, shared prompt, page prompts, generation settings, page statuses, errors, and result references
- **AND** it SHALL NOT persist original image binaries, large data URLs, base64 image payloads, full provider responses, or exported ZIP/PPTX/PDF files as part of the history record

#### Scenario: Restore a project from history
- **GIVEN** the user opens comic history
- **WHEN** the user selects a previous project
- **THEN** the system SHALL restore editable prompts, page ordering, generation settings, page statuses, and result references
- **AND** if a result reference is unavailable, the system SHALL present the page as restorable by regeneration instead of loading embedded image data from history

#### Scenario: Manage history records
- **WHEN** the user views comic history
- **THEN** the system SHALL allow filtering or locating records by title, timestamp, and status
- **AND** the user SHALL be able to delete a history record without deleting unrelated generated assets

### Requirement: Export Comic Projects
The system SHALL export completed or partially completed comic projects to ZIP, PPTX, and PDF formats.

#### Scenario: Export as ZIP
- **GIVEN** a comic project has one or more generated page images
- **WHEN** the user exports ZIP
- **THEN** the system SHALL create an archive containing page images named in page order
- **AND** it SHALL include a lightweight metadata file describing title, prompts, page order, and generation settings

#### Scenario: Export as PPTX
- **GIVEN** a comic project has one or more generated page images
- **WHEN** the user exports PPTX
- **THEN** the system SHALL create a presentation with one generated page image per slide
- **AND** slides SHALL preserve page order and include title or page number information where configured

#### Scenario: Export as PDF
- **GIVEN** a comic project has one or more generated page images
- **WHEN** the user exports PDF
- **THEN** the system SHALL create a PDF with generated page images in page order
- **AND** the export SHALL skip or report pages that do not have usable result references

### Requirement: Memory-Constrained Media Handling
The system SHALL enforce memory-safe handling for generated images and export assets.

#### Scenario: Avoid persisting large image payloads
- **WHEN** a page image generation succeeds
- **THEN** the system SHALL persist only lightweight result references and preview metadata in project state
- **AND** it SHALL NOT store full-size images or base64 payloads in durable history storage

#### Scenario: Fetch export images with bounded concurrency
- **GIVEN** a comic project has multiple generated image references
- **WHEN** the user exports ZIP, PPTX, or PDF
- **THEN** the export pipeline SHALL fetch images from their references serially or with a bounded concurrency limit
- **AND** it SHALL NOT eagerly load all full-size page images into memory before writing the export

#### Scenario: Release temporary export resources
- **GIVEN** an export operation is processing page images
- **WHEN** each page image has been written to the target export format
- **THEN** the system SHALL release temporary buffers or object URLs for that page as soon as they are no longer needed
- **AND** export failure SHALL leave the editable project and existing result references intact
