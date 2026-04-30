# canvas-text-to-speech Specification

## Purpose
TBD - created by archiving change add-canvas-text-to-speech-toolbar. Update Purpose after archive.
## Requirements
### Requirement: Read selected canvas text aloud
The system SHALL expose a text-to-speech action in the popup toolbar when the current canvas selection contains readable text content.

#### Scenario: Read a selected text element
- **GIVEN** the user selects a canvas text element with non-empty text
- **WHEN** the popup toolbar is shown
- **THEN** the toolbar SHALL display a speech action
- **AND** activating the action SHALL read the text content aloud

#### Scenario: Pause and resume active speech
- **GIVEN** canvas text-to-speech is currently speaking
- **WHEN** the user activates the same speech action again
- **THEN** the system SHALL pause playback
- **AND** activating it once more SHALL resume playback

### Requirement: Prefer explicit Card text selection
The system SHALL prefer a concrete text selection inside a selected Card or Markdown container over the full element content.

#### Scenario: Read selected text inside a Card
- **GIVEN** the user has selected a Card on the canvas
- **AND** the user has highlighted a text range inside the Card body
- **WHEN** the speech action is activated
- **THEN** the system SHALL read only the highlighted text range

#### Scenario: Fall back to the whole Card content
- **GIVEN** the user has selected a Card on the canvas
- **AND** there is no active text range inside the Card body
- **WHEN** the speech action is activated
- **THEN** the system SHALL read the Card title and body content

