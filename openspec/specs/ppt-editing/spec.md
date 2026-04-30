# ppt-editing Specification

## Purpose
TBD - created by archiving change add-ppt-slide-transitions. Update Purpose after archive.
## Requirements
### Requirement: PPT Page Transition Menu

The system SHALL provide a per-page PPT transition menu from the single-page PPT right-click menu.

#### Scenario: Hover transition submenu

- **GIVEN** the PPT editing panel shows slide page cards
- **WHEN** the user right-clicks a single PPT page card and hovers the animation menu
- **THEN** the system SHALL show supported slide transition choices
- **AND** the currently selected transition SHALL be indicated

#### Scenario: Select transition

- **GIVEN** the user opens the PPT page transition submenu
- **WHEN** the user selects a transition
- **THEN** the system SHALL store the transition on that page's PPT metadata
- **AND** subsequent editor renders SHALL show the selected transition as current

### Requirement: PPT Slideshow Transition Playback

The system SHALL apply the selected per-page transition during in-app PPT slideshow playback.

#### Scenario: Navigate to page with transition

- **GIVEN** a PPT page has a supported transition configured
- **WHEN** slideshow playback navigates to that page
- **THEN** the visible page change SHALL use the configured transition effect

#### Scenario: Reduced motion

- **GIVEN** the user environment prefers reduced motion
- **WHEN** slideshow playback navigates between PPT pages
- **THEN** the system SHALL avoid animated transition effects

### Requirement: PPTX Transition Export

The system SHALL include supported per-page slide transitions in downloaded PPTX files.

#### Scenario: Export configured transitions

- **GIVEN** PPT pages have supported transitions configured
- **WHEN** the user downloads the PPT deck
- **THEN** the generated PPTX SHALL include slide transition metadata for those pages
- **AND** pages without configured transitions SHALL keep the existing no-transition behavior

#### Scenario: Ignore invalid transition metadata

- **GIVEN** a PPT page contains missing or invalid transition metadata
- **WHEN** the user downloads the PPT deck or plays the slideshow
- **THEN** the system SHALL treat that page as having no transition

### Requirement: Image-First PPT Generation
The system SHALL generate PPT pages as slide Frames whose primary visual content is a complete 16:9 generated image containing the page text, layout, background, and visual design.

#### Scenario: Generate PPT pages from content
- **GIVEN** the user invokes PPT generation from a topic or mindmap
- **WHEN** the system creates the PPT pages
- **THEN** it SHALL create one Frame per page
- **AND** it SHALL associate each Frame with the whole-slide generation prompt
- **AND** it SHALL generate or enqueue one full-slide image for each page
- **AND** it SHALL insert the resulting image into the corresponding Frame as the primary slide image

#### Scenario: Page image generation fails
- **GIVEN** a PPT page image generation task fails
- **WHEN** the PPT editing panel shows the page
- **THEN** the page SHALL remain available with its original generation prompt
- **AND** the user SHALL be able to regenerate that page without recreating the whole PPT

### Requirement: PPT Editing Panel
The system SHALL present Frame-based PPT pages through a PPT editing panel that previews and manages pages in deck order.

#### Scenario: Preview PPT pages
- **GIVEN** the current canvas contains PPT Frames
- **WHEN** the user opens the PPT editing panel
- **THEN** each PPT page SHALL show a page card with its index, name, dimensions, and preview image when available
- **AND** clicking a page card SHALL focus/select the corresponding Frame on the canvas

#### Scenario: Hide obsolete PPT actions
- **GIVEN** the current canvas contains PPT Frames
- **WHEN** the PPT editing panel renders actions
- **THEN** it SHALL NOT show PPT background image controls
- **AND** it SHALL NOT show single-page PPT export actions
- **AND** it SHALL keep full-deck PPT export available

### Requirement: PPT Page Regeneration
The system SHALL replace single-page PPT export with page regeneration that uses the existing page image as a reference.

#### Scenario: Open regeneration dialog
- **GIVEN** a PPT page has a stored generation prompt
- **WHEN** the user clicks “重新生成” for that page
- **THEN** the AI image generation dialog SHALL open with the stored prompt prefilled
- **AND** the current primary slide image SHALL be attached as a reference image when available
- **AND** the target Frame id and dimensions SHALL be passed for automatic回填

#### Scenario: Regeneration succeeds
- **GIVEN** a PPT page regeneration task completes successfully
- **WHEN** the generated image is inserted back into the target Frame
- **THEN** the previous primary slide image SHALL be replaced by the new image
- **AND** the page preview SHALL show the new image
- **AND** the Frame SHALL remain in the same deck order

#### Scenario: Regeneration fails or is cancelled
- **GIVEN** a PPT page regeneration task fails or is cancelled
- **WHEN** the task finishes without a usable image
- **THEN** the previous primary slide image SHALL remain unchanged
- **AND** the page SHALL remain available for another regeneration attempt

