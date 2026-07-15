## ADDED Requirements

### Requirement: Request-Body Async Xingtu Account Image Jobs

The system SHALL support asynchronous backend image jobs for Xingtu account image generation and image edit requests submitted to the normal image endpoints with an `async` request field.

#### Scenario: Xingtu account image generation returns a job

- **GIVEN** the resolved invocation route uses provider profile `xingtu-login`
- **AND** the route credential source is `oidc-session`
- **AND** the user submits an image generation request
- **WHEN** the frontend executes the image request
- **THEN** it SHALL call `POST /v1/images/generations` with JSON `async: true`
- **AND** the frontend SHALL receive a backend job id instead of waiting for the final image in the submit request
- **AND** the frontend SHALL poll `GET /v1/images/generations/{job_id}` until the job reaches a terminal state

#### Scenario: Async flag is not forwarded upstream

- **GIVEN** a client submits `POST /v1/images/generations` with JSON `async: true`
- **WHEN** the backend accepts the async job
- **THEN** the backend SHALL remove the `async` field before storing the job request body
- **AND** the worker SHALL forward the sanitized body to LLM Gateway without the local-only `async` field

#### Scenario: Xingtu account image edit returns a job

- **GIVEN** the resolved invocation route uses provider profile `xingtu-login`
- **AND** the route credential source is `oidc-session`
- **AND** the user submits an image edit request with reference/edit inputs
- **WHEN** the frontend executes the request
- **THEN** it SHALL call `POST /v1/images/edits` with multipart field `async=true`
- **AND** the frontend SHALL receive a backend job id instead of waiting for the final image in the submit request
- **AND** the frontend SHALL poll `GET /v1/images/generations/{job_id}` until the job reaches a terminal state

### Requirement: Preserve Existing Image Result Flow

The system SHALL convert successful backend image job results into the existing frontend image result shape before updating task, cache, preview, or canvas insertion flows.

#### Scenario: Async image job succeeds

- **GIVEN** a Xingtu account backend image job is completed successfully
- **WHEN** the frontend reads the completed job result
- **THEN** the executor SHALL return the existing image result shape used by current image generation code
- **AND** existing media caching, task completion, preview, and canvas insertion flows SHALL be reused

#### Scenario: Async image job survives refresh

- **GIVEN** a Xingtu account image task has a backend job id stored in existing task metadata or `remoteId`
- **WHEN** the page reloads before the job completes
- **THEN** task recovery SHALL resume polling `GET /v1/images/generations/{job_id}`
- **AND** SHALL update the existing task state when the backend job completes or fails

### Requirement: Backend Credits For Async Image Jobs

The system SHALL charge Credits when an async Xingtu account image job is accepted and refund Credits exactly once when the job fails.

#### Scenario: Accepted async job charges Credits

- **GIVEN** a user has sufficient Credits for the selected image model and request type
- **WHEN** the Xingtu backend accepts an async image job
- **THEN** the backend SHALL charge Credits before returning the job id
- **AND** the job SHALL record the charge request id for later refund decisions

#### Scenario: Failed async job refunds Credits

- **GIVEN** an async image job has charged Credits
- **WHEN** the backend worker marks the job failed because the LLM-Gateway request fails or returns a non-success status
- **THEN** the backend SHALL refund the charge exactly once
- **AND** repeated worker retries or recovery logic SHALL NOT double-refund the same job

### Requirement: Preserve Synchronous Image API Compatibility

The system SHALL keep the existing synchronous OpenAI-compatible image endpoints available for direct API callers unless callers explicitly request backend async generation with JSON `async: true`.

#### Scenario: Direct API caller uses synchronous generation endpoint

- **GIVEN** a client calls `POST /v1/images/generations`
- **AND** the request body does not contain top-level JSON `async: true`
- **WHEN** the request is handled by the Xingtu backend
- **THEN** the endpoint SHALL return the upstream image response synchronously
- **AND** SHALL NOT return an async job id

#### Scenario: Direct API caller uses async generation endpoint shape

- **GIVEN** a client calls `POST /v1/images/generations`
- **AND** the request body contains top-level JSON `async: true`
- **WHEN** the request is handled by the Xingtu backend
- **THEN** the endpoint SHALL create an internal image job
- **AND** SHALL return a backend job id for polling

#### Scenario: Direct API caller uses synchronous edit endpoint

- **GIVEN** a client calls `POST /v1/images/edits`
- **AND** the multipart request does not contain field `async=true`
- **WHEN** the request is handled by the Xingtu backend
- **THEN** the endpoint SHALL return the upstream image edit response synchronously
- **AND** SHALL NOT return an async job id

#### Scenario: Direct API caller uses async edit endpoint shape

- **GIVEN** a client calls `POST /v1/images/edits`
- **AND** the multipart request contains field `async=true`
- **WHEN** the request is handled by the Xingtu backend
- **THEN** the endpoint SHALL create an internal image edit job
- **AND** SHALL strip the `async` field before storing or forwarding the multipart body
- **AND** SHALL return a backend job id for polling

### Requirement: Remove Special Async Image Endpoints

The system SHALL remove the previous special async image job routes from the public API.

#### Scenario: Old async submit route is unavailable

- **GIVEN** a client calls `POST /v1/images/generations/async`
- **WHEN** the request reaches the backend router
- **THEN** the backend SHALL NOT route it to image job submission

#### Scenario: Old job query route is unavailable

- **GIVEN** a client calls `GET /v1/images/jobs/{id}`
- **WHEN** the request reaches the backend router
- **THEN** the backend SHALL NOT route it to image job lookup
