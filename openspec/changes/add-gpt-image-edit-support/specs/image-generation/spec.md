## ADDED Requirements

### Requirement: Support Official GPT Image Edit Requests

The system SHALL send official GPT Image edit requests to `/images/edits` when an official GPT Image profile is selected and the image request includes edit inputs.

#### Scenario: Reference-image request uses edit endpoint

- **GIVEN** a provider profile resolves image API compatibility to `openai-gpt-image`
- **AND** the selected model is a GPT Image model
- **AND** the image request includes at least one reference image
- **WHEN** the image task is executed
- **THEN** the GPT Image adapter SHALL send the request to `/images/edits`
- **AND** include input images as multipart `image[]` file fields
- **AND** SHALL NOT include `response_format`

#### Scenario: Text-only request remains generation

- **GIVEN** a provider profile resolves image API compatibility to `openai-gpt-image`
- **AND** the selected model is a GPT Image model
- **AND** the image request has no reference images or edit inputs
- **WHEN** the image task is executed
- **THEN** the GPT Image adapter SHALL send the request to `/images/generations`

### Requirement: Preserve Basic Reference-Image Compatibility

The system SHALL preserve the existing default adapter behavior for reference-image requests when the selected profile resolves to a basic compatibility mode.

#### Scenario: Tuzi reference-image request stays basic

- **GIVEN** a provider profile resolves image API compatibility to `tuzi-compatible`
- **AND** the selected model is a GPT Image model
- **AND** the request includes reference images
- **WHEN** the image task is executed
- **THEN** the request SHALL remain eligible for the default adapter
- **AND** SHALL NOT require the official GPT Image edit schema
