# ai-input-generation Specification

## Purpose
TBD - created by archiving change add-agent-skill-media-model-selectors. Update Purpose after archive.
## Requirements
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

### Requirement: AI Input Bar SHALL Distinguish Agent And Text Generation

The system SHALL expose `agent` and `text` as separate generation types in the AI input bar.

#### Scenario: User selects text generation
- **WHEN** the user switches the generation type to `text`
- **THEN** the AI input bar SHALL show text models
- **AND** SHALL hide Skill selection
- **AND** SHALL treat the request as direct text generation

#### Scenario: User selects agent generation
- **WHEN** the user switches the generation type to `agent`
- **THEN** the AI input bar SHALL show Skill selection
- **AND** SHALL route the request through the existing Agent analysis flow

### Requirement: Text Generation SHALL Insert Results Into Canvas

The system SHALL insert direct text generation results into the canvas after the text model returns content.

#### Scenario: Text model returns markdown-like content
- **WHEN** a direct text generation request completes
- **THEN** the system SHALL insert the text result through the existing canvas insertion flow
- **AND** MAY parse markdown cards before falling back to plain text insertion

### Requirement: Text Generation SHALL Support Scoped Model Parameters

The system SHALL persist text-generation model parameters independently from agent mode.

#### Scenario: User switches between text models
- **WHEN** the user changes text models in direct text mode
- **THEN** the system SHALL restore the last compatible parameters for the selected text model
- **AND** SHALL NOT reuse agent-only state such as selected Skill

