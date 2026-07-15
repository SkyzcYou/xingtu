## ADDED Requirements

### Requirement: Scope Async Image Routing To Xingtu Account Profile

The system SHALL route image generation and edit requests to the Xingtu backend request-body async job path only when the resolved invocation route is the built-in Xingtu account provider profile.

#### Scenario: Xingtu account route uses async image jobs

- **GIVEN** the resolved invocation route has `profileId` equal to `xingtu-login`
- **AND** the route credential source is `oidc-session`
- **AND** the operation is image generation
- **WHEN** the image executor selects a transport path
- **THEN** it SHALL use `POST /v1/images/generations` with JSON `async: true`
- **AND** it SHALL poll `GET /v1/images/generations/{job_id}`

#### Scenario: Xingtu account image edit uses request-body async jobs

- **GIVEN** the resolved invocation route has `profileId` equal to `xingtu-login`
- **AND** the route credential source is `oidc-session`
- **AND** the operation is image edit
- **WHEN** the image executor selects a transport path
- **THEN** it SHALL use `POST /v1/images/edits` with multipart field `async=true`
- **AND** it SHALL poll `GET /v1/images/generations/{job_id}`

#### Scenario: Xingtu API Key route stays synchronous

- **GIVEN** the resolved invocation route has `profileId` equal to `legacy-default`
- **AND** the route uses an API Key credential source
- **AND** the operation is image generation or image edit
- **WHEN** the image executor selects a transport path
- **THEN** it SHALL use the existing providerTransport/model-adapter path
- **AND** SHALL NOT submit a Xingtu backend async image job

#### Scenario: Custom provider route stays on existing transport

- **GIVEN** the resolved invocation route uses a custom or third-party provider profile
- **AND** the operation is image generation or image edit
- **WHEN** the image executor selects a transport path
- **THEN** it SHALL use the existing providerTransport/model-adapter path
- **AND** SHALL NOT submit a Xingtu backend async image job

#### Scenario: Non-image operation stays unchanged

- **GIVEN** the resolved invocation route uses provider profile `xingtu-login`
- **AND** the operation is text, chat, model discovery, audio, or video
- **WHEN** the executor selects a transport path
- **THEN** it SHALL NOT use the Xingtu backend async image job executor introduced by this change

### Requirement: Avoid Heuristic Async Routing

The system SHALL NOT decide async image routing from model names, provider display names, or base URL string matching.

#### Scenario: Matching base URL alone is insufficient

- **GIVEN** a route has a base URL that points at a Xingtu backend host
- **AND** the route profile is not `xingtu-login` with credential source `oidc-session`
- **WHEN** the image executor selects a transport path
- **THEN** it SHALL NOT enter the async image job path solely because of the base URL

#### Scenario: Matching model name alone is insufficient

- **GIVEN** a route selects a model that is also available through the Xingtu account backend
- **AND** the route profile is not `xingtu-login` with credential source `oidc-session`
- **WHEN** the image executor selects a transport path
- **THEN** it SHALL NOT enter the async image job path solely because of the model name
