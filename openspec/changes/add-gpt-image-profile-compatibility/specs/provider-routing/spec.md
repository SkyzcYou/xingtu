## ADDED Requirements

### Requirement: Resolve Image API Compatibility Per Provider Profile

The system SHALL resolve image API compatibility from the selected provider profile before inferring an image request schema.

#### Scenario: Same GPT Image model uses different contracts by profile

- **GIVEN** two enabled provider profiles both expose `gpt-image-2`
- **AND** the first profile has image API compatibility `tuzi-gpt-image`
- **AND** the second profile has image API compatibility `openai-gpt-image`
- **WHEN** the user invokes image generation with a `ModelRef` pointing to either profile
- **THEN** the system SHALL resolve the image compatibility from that profile
- **AND** SHALL allow the same `modelId` to produce different request schemas by `profileId`

#### Scenario: Manual compatibility overrides automatic inference

- **GIVEN** a provider profile has image API compatibility set to a non-`auto` value
- **WHEN** image binding inference runs for that profile
- **THEN** the system SHALL use the manually selected compatibility mode
- **AND** SHALL NOT replace it with an automatically inferred mode

### Requirement: Infer Automatic Image Compatibility Conservatively

The system SHALL support an `auto` image API compatibility mode that infers a compatibility mode from provider profile metadata and the selected model.

#### Scenario: Official OpenAI GPT Image auto inference

- **GIVEN** a provider profile uses an `api.openai.com` base URL
- **AND** the selected image model ID starts with `gpt-image`
- **AND** the profile image API compatibility is `auto`
- **WHEN** the system infers image compatibility
- **THEN** it SHALL resolve to the OpenAI GPT Image format

#### Scenario: Tuzi auto inference selects dedicated Tuzi GPT mode

- **GIVEN** a provider profile uses an `api.tu-zi.com` base URL
- **AND** the profile image API compatibility is `auto`
- **WHEN** the system infers image compatibility
- **THEN** it SHALL resolve to the Tuzi GPT image format
- **AND** SHALL keep the request eligible for the dedicated Tuzi GPT Image adapter path

#### Scenario: Generic OpenAI-compatible auto inference

- **GIVEN** a provider profile is `openai-compatible` or `custom`
- **AND** it is not recognized as official OpenAI or Tuzi
- **AND** the profile image API compatibility is `auto`
- **WHEN** the system infers image compatibility
- **THEN** it SHALL resolve to the generic OpenAI-compatible image format

### Requirement: Map Image Compatibility To Request Schema

The system SHALL map the resolved image API compatibility mode to the request schema used by provider routing.

#### Scenario: OpenAI GPT Image compatibility selects GPT schema

- **GIVEN** a GPT Image model invocation resolves to OpenAI GPT Image compatibility
- **WHEN** the provider binding is inferred
- **THEN** the binding SHALL use `openai.image.gpt-generation-json`
- **AND** SHALL be eligible for the GPT Image adapter

#### Scenario: Basic compatibility selects existing schema

- **GIVEN** a GPT Image model invocation resolves to generic OpenAI-compatible image compatibility
- **WHEN** the provider binding is inferred
- **THEN** the binding SHALL use `openai.image.basic-json`
- **AND** SHALL be eligible for the existing default image adapter
