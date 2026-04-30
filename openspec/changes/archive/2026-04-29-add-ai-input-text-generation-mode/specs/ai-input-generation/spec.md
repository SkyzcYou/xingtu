## ADDED Requirements

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
