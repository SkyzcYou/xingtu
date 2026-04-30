# provider-routing Specification

## Purpose
TBD - created by archiving change add-gpt-image-edit-support. Update Purpose after archive.
## Requirements
### Requirement: Prefer Image Request Schema Per Invocation

The system SHALL allow an image invocation to prefer a request schema when multiple bindings exist for the same provider profile and model.

#### Scenario: Prefer GPT Image edit schema

- **GIVEN** a provider profile exposes both `openai.image.gpt-generation-json` and `openai.image.gpt-edit-form` for the same GPT Image model
- **WHEN** the invocation asks for preferred request schema `openai.image.gpt-edit-form`
- **THEN** the invocation plan SHALL select the edit binding

#### Scenario: Fall back when preferred schema is unavailable

- **GIVEN** a provider profile has only `openai.image.basic-json` for a GPT Image model
- **WHEN** the invocation asks for preferred request schema `openai.image.gpt-edit-form`
- **THEN** the invocation plan SHALL fall back to the available basic binding

### Requirement: Add Official GPT Image Edit Binding

The system SHALL infer an official GPT Image edit binding for provider profiles that resolve to official GPT Image compatibility.

#### Scenario: Official GPT Image profile exposes edit binding

- **GIVEN** a provider profile resolves image API compatibility to `openai-gpt-image`
- **AND** the selected model is a GPT Image model
- **WHEN** image bindings are inferred
- **THEN** one binding SHALL use request schema `openai.image.gpt-edit-form`
- **AND** submit path `/images/edits`
- **AND** protocol `openai.images.edits`

