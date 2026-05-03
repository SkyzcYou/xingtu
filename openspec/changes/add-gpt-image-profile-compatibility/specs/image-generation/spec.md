## ADDED Requirements

### Requirement: Preserve Generic GPT Image Basic Compatibility

The system SHALL preserve the existing default image adapter path only for GPT Image requests that resolve to the generic basic image compatibility mode.

#### Scenario: Generic GPT Image generation stays on default adapter

- **GIVEN** a provider profile resolves image API compatibility to `openai-compatible-basic`
- **AND** the selected model is `gpt-image-2`
- **WHEN** the user submits a text-to-image request
- **THEN** the request SHALL use the `openai.image.basic-json` schema
- **AND** SHALL continue to use the existing default image adapter compatibility behavior

#### Scenario: Tuzi GPT Image uses dedicated adapter ownership

- **GIVEN** a provider profile resolves image API compatibility to `tuzi-gpt-image`
- **AND** the user submits an image generation request with reference images
- **WHEN** the request is serialized
- **THEN** the system SHALL route through the dedicated Tuzi GPT Image adapter boundary
- **AND** SHALL NOT hide Tuzi GPT-specific request translation inside the generic default adapter

### Requirement: Support Official GPT Image Generation Adapter

The system SHALL provide a dedicated GPT Image adapter for provider profiles that resolve to the official GPT Image format.

#### Scenario: Official GPT Image text-to-image request

- **GIVEN** a provider profile resolves image API compatibility to `openai-gpt-image`
- **AND** the selected image model is a GPT Image model
- **WHEN** the user submits a text-to-image request
- **THEN** the system SHALL route the request to the GPT Image adapter
- **AND** SHALL send a generation request to `/images/generations`
- **AND** SHALL NOT default `response_format` to `url`

#### Scenario: Official GPT Image response parsing

- **GIVEN** the GPT Image adapter receives a response containing `data[].b64_json`
- **WHEN** the response is parsed
- **THEN** the system SHALL normalize the image into the existing image result shape
- **AND** SHALL support URL-based gateway variants without failing valid responses

### Requirement: Keep Image Generation Task Surface Stable

The system SHALL keep the current image task and tool surface stable for this change.

#### Scenario: GPT Image compatibility does not create a new task type

- **GIVEN** a user submits a GPT Image generation request
- **WHEN** the task is created
- **THEN** it SHALL remain a `TaskType.IMAGE` task
- **AND** SHALL continue through the existing task queue, media library, and canvas insertion flows

#### Scenario: GPT Image compatibility does not require a new tool name

- **GIVEN** an agent or workflow invokes image generation
- **WHEN** GPT Image compatibility routing is applied
- **THEN** the invocation SHALL continue to use the existing image generation tool surface
- **AND** SHALL NOT require a new public `edit_image` tool for this change
