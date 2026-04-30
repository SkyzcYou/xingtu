# canvas-text-to-speech-toolbar Specification

## Purpose
TBD - created by archiving change add-canvas-text-to-speech-toolbar. Update Purpose after archive.
## Requirements
### Requirement: Canvas popup toolbar text-to-speech
The system SHALL expose a text-to-speech action in the canvas popup toolbar when the current selection contains readable text or markdown content.

#### Scenario: Read a selected text element
- **GIVEN** the user has selected a text-bearing canvas element
- **WHEN** the popup toolbar is shown
- **THEN** the toolbar SHALL display a text-to-speech action
- **AND** activating the action SHALL read the selected element content aloud

#### Scenario: Prefer card text selection over full card content
- **GIVEN** the user has selected a card element with markdown content
- **AND** the user has highlighted a portion of text inside the card body
- **WHEN** the text-to-speech action is activated
- **THEN** the system SHALL read the highlighted text instead of the full card content

#### Scenario: Toggle pause and resume while speaking
- **GIVEN** the canvas text-to-speech action is currently reading content aloud
- **WHEN** the user activates the same action again
- **THEN** the system SHALL pause the current reading
- **AND** a subsequent activation SHALL resume the same reading session

