## ADDED Requirements

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
