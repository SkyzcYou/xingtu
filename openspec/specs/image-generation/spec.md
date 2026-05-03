# image-generation Specification

## Purpose
TBD - created by archiving change add-gpt-image-edit-support. Update Purpose after archive.
## Requirements
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

### Requirement: Route Tuzi GPT Image Through Dedicated Adapter

The system SHALL route Tuzi GPT Image generation and edit requests through the dedicated Tuzi GPT Image adapter when the selected profile resolves to Tuzi GPT Image compatibility.

#### Scenario: Tuzi GPT request uses Tuzi adapter

- **GIVEN** a provider profile resolves image API compatibility to `tuzi-gpt-image`
- **AND** the selected model is a GPT Image model
- **WHEN** the image task is executed
- **THEN** the request SHALL be handled by the dedicated Tuzi GPT Image adapter
- **AND** SHALL NOT rely on GPT-specific translation logic inside the generic default adapter

### Requirement: Preserve Generic Basic Compatibility

The system SHALL preserve the default adapter behavior only for generic OpenAI-compatible image gateways that resolve to the basic compatibility mode.

#### Scenario: Generic compatibility stays basic

- **GIVEN** a provider profile resolves image API compatibility to `openai-compatible-basic`
- **WHEN** the image task is executed
- **THEN** the request SHALL remain eligible for the default adapter
