## ADDED Requirements

### Requirement: Resolve GPT Image Compatibility To A Concrete Internal Mode

The system SHALL resolve GPT Image compatibility from the selected provider profile into a concrete internal mode before adapter selection.

#### Scenario: Automatic resolution chooses official GPT mode

- **GIVEN** a provider profile uses an `api.openai.com` base URL
- **AND** the selected image model is a GPT Image model
- **AND** the stored image API compatibility is `auto`
- **WHEN** provider routing resolves image compatibility
- **THEN** it SHALL resolve to `openai-gpt-image`

#### Scenario: Automatic resolution chooses Tuzi GPT mode

- **GIVEN** a provider profile uses an `api.tu-zi.com` base URL
- **AND** the selected image model is a GPT Image model
- **AND** the stored image API compatibility is `auto`
- **WHEN** provider routing resolves image compatibility
- **THEN** it SHALL resolve to `tuzi-gpt-image`

#### Scenario: Automatic resolution chooses generic fallback

- **GIVEN** a provider profile is neither official OpenAI nor Tuzi
- **AND** the selected image model is a GPT Image model
- **AND** the stored image API compatibility is `auto`
- **WHEN** provider routing resolves image compatibility
- **THEN** it SHALL resolve to `openai-compatible-basic`

#### Scenario: Manual compatibility override wins over auto inference

- **GIVEN** a provider profile stores a non-`auto` image API compatibility value
- **WHEN** provider routing resolves image compatibility
- **THEN** it SHALL use the stored value directly
- **AND** SHALL NOT replace it with an inferred mode

### Requirement: Preserve Legacy Compatibility Values

The system SHALL accept previously stored GPT image compatibility values while converging on the refined internal mode names.

#### Scenario: Legacy Tuzi value is normalized

- **GIVEN** a provider profile stores the legacy compatibility value `tuzi-compatible`
- **WHEN** the profile is normalized or loaded into a routing snapshot
- **THEN** the system SHALL treat it as `tuzi-gpt-image`
- **AND** SHALL keep the profile eligible for the dedicated Tuzi GPT path

### Requirement: Map Internal Modes To Distinct Request Schemas

The system SHALL use request schemas as the formal dispatch boundary between official GPT, Tuzi GPT, and generic fallback routing.

#### Scenario: Official GPT generation emits official schema

- **GIVEN** a GPT Image invocation resolves to `openai-gpt-image`
- **WHEN** the request uses generation semantics
- **THEN** the inferred binding SHALL use request schema `openai.image.gpt-generation-json`

#### Scenario: Official GPT edit emits official edit schema

- **GIVEN** a GPT Image invocation resolves to `openai-gpt-image`
- **WHEN** the request uses edit semantics
- **THEN** the inferred binding SHALL use request schema `openai.image.gpt-edit-form`
- **AND** SHALL submit to `/images/edits`

#### Scenario: Tuzi GPT generation emits dedicated Tuzi schema

- **GIVEN** a GPT Image invocation resolves to `tuzi-gpt-image`
- **WHEN** the request uses generation semantics
- **THEN** the inferred binding SHALL use a dedicated Tuzi GPT generation request schema
- **AND** SHALL NOT collapse into `openai.image.basic-json`

#### Scenario: Generic fallback remains on the basic schema

- **GIVEN** a GPT Image invocation resolves to `openai-compatible-basic`
- **WHEN** the provider binding is inferred
- **THEN** the binding SHALL use request schema `openai.image.basic-json`

### Requirement: Keep Compatibility Metadata And Dispatch In Sync

The system SHALL keep resolved compatibility metadata aligned with the schema used for dispatch.

#### Scenario: Tuzi GPT no longer exists only in metadata

- **GIVEN** a GPT Image invocation resolves to `tuzi-gpt-image`
- **WHEN** routing emits metadata for diagnostics
- **THEN** the emitted `requestSchema` and adapter selection SHALL reflect the Tuzi GPT contract
- **AND** SHALL NOT route through the generic default adapter while only labeling the request as Tuzi-compatible
