## ADDED Requirements

### Requirement: Agent Skill Media Model Selectors

The AI input bar SHALL show additional media model selectors when Agent mode has an explicitly selected Skill that is known to invoke media generation.

#### Scenario: Image or PPT Skill selected
- **GIVEN** the user is in Agent mode
- **AND** the selected Skill is classified as image or PPT output
- **WHEN** the input bar renders
- **THEN** it SHALL keep the text model selector for Agent analysis
- **AND** it SHALL show an image model selector for the Skill's media generation

#### Scenario: Video Skill selected
- **GIVEN** the user is in Agent mode
- **AND** the selected Skill is classified as video output
- **WHEN** the input bar renders
- **THEN** it SHALL keep the text model selector for Agent analysis
- **AND** it SHALL show a video model selector for the Skill's media generation

#### Scenario: Audio Skill selected
- **GIVEN** the user is in Agent mode
- **AND** the selected Skill is classified as audio output
- **WHEN** the input bar renders
- **THEN** it SHALL keep the text model selector for Agent analysis
- **AND** it SHALL show an audio model selector for the Skill's media generation

#### Scenario: Auto Skill selected
- **GIVEN** the user is in Agent mode
- **AND** the selected Skill is Auto
- **WHEN** the input bar renders
- **THEN** it SHALL NOT show additional media model selectors

### Requirement: Agent Skill Media Model Routing

Agent and Skill workflows SHALL pass selected media model IDs and model references to downstream media generation tools.

#### Scenario: Dynamic media tool call
- **GIVEN** Agent analysis emits a media generation tool call without a model
- **WHEN** the execution context contains a selected model for that media type
- **THEN** the generated workflow step SHALL include that selected model
- **AND** it SHALL include the matching `modelRef` when available

#### Scenario: Parsed Skill workflow step
- **GIVEN** a Skill DSL resolves directly to a media generation workflow step
- **WHEN** the execution context contains a selected model for that media type
- **THEN** the workflow step SHALL use the selected media model
- **AND** it SHALL include the matching `modelRef` when available
