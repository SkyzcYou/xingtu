## ADDED Requirements

### Requirement: Keep Official GPT Image On The Dedicated Official Adapter

The system SHALL keep official GPT Image generation and edit requests on the dedicated official adapter path.

#### Scenario: Official GPT text-to-image uses the official adapter

- **GIVEN** a provider profile resolves image API compatibility to `openai-gpt-image`
- **AND** the selected model is a GPT Image model
- **WHEN** the user submits a text-to-image request
- **THEN** the request SHALL be handled by the dedicated official GPT image adapter
- **AND** SHALL use `/images/generations`

#### Scenario: Official GPT edit uses the official edit transport

- **GIVEN** a provider profile resolves image API compatibility to `openai-gpt-image`
- **AND** the selected model is a GPT Image model
- **AND** the request includes edit inputs
- **WHEN** the image task executes
- **THEN** the dedicated official GPT image adapter SHALL send the request to `/images/edits`
- **AND** SHALL use multipart/form-data

### Requirement: Route Tuzi GPT Generation Through A Dedicated Tuzi Adapter

The system SHALL route Tuzi GPT generation through a dedicated Tuzi GPT image adapter instead of the generic default/basic adapter.

#### Scenario: Tuzi GPT generation uses dedicated adapter ownership

- **GIVEN** a provider profile resolves image API compatibility to `tuzi-gpt-image`
- **AND** the selected model is a GPT Image model
- **WHEN** the user submits a text-to-image request
- **THEN** the request SHALL be handled by the dedicated Tuzi GPT image adapter
- **AND** SHALL NOT rely on GPT-specific translation logic hidden inside the generic default/basic adapter

### Requirement: Keep Generic Basic Compatibility As Fallback

The system SHALL preserve a generic fallback path for broad OpenAI-compatible image gateways.

#### Scenario: Generic compatibility still uses the default adapter

- **GIVEN** a provider profile resolves image API compatibility to `openai-compatible-basic`
- **WHEN** the user submits an image request
- **THEN** the request SHALL remain eligible for the default/basic image adapter

### Requirement: Keep Official Quality Semantics Separate From Legacy Resolution Folding

The system SHALL keep official GPT image quality semantics separate from legacy compatibility resolution semantics.

#### Scenario: Official GPT forwards official quality values

- **GIVEN** a provider profile resolves image API compatibility to `openai-gpt-image`
- **AND** the request includes official GPT image quality such as `auto`, `low`, `medium`, or `high`
- **WHEN** the request is serialized
- **THEN** the outbound official GPT request SHALL preserve the official quality meaning

#### Scenario: Tuzi GPT folds compatibility resolution into legacy quality

- **GIVEN** a provider profile resolves image API compatibility to `tuzi-gpt-image`
- **AND** the request includes a compatibility resolution tier such as `1k`, `2k`, or `4k`
- **WHEN** the request is serialized
- **THEN** the Tuzi GPT adapter SHALL translate that compatibility resolution into the outbound Tuzi/basic quality field
- **AND** SHALL NOT blindly forward official GPT quality values unless the Tuzi contract explicitly supports them

### Requirement: Prepare Tuzi Edit Support Without Rebinding It To Generic Fallback

The system SHALL leave room for a future Tuzi GPT edit contract without requiring it to live permanently inside the generic fallback adapter.

#### Scenario: Tuzi edit remains a dedicated follow-up

- **GIVEN** a provider profile resolves image API compatibility to `tuzi-gpt-image`
- **WHEN** the system later adds image-edit support for that mode
- **THEN** the implementation SHALL route through the Tuzi GPT adapter boundary
- **AND** SHALL NOT require the generic fallback adapter to become the long-term owner of Tuzi GPT edit semantics
