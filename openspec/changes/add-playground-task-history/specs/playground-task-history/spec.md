## ADDED Requirements

### Requirement: Account-scoped Playground history

The system SHALL persist Playground text and image task history under the authenticated account and SHALL return only records owned by that account.

#### Scenario: History is available on another device

- **WHEN** an authenticated account completes a Playground text or image attempt on one device
- **AND** the same account opens Playground on another device
- **THEN** the recorded task appears in the account’s Playground history

#### Scenario: Accounts are isolated

- **WHEN** an authenticated account lists Playground history
- **THEN** the response contains only that account’s records

#### Scenario: Non-Playground proxy call completes

- **WHEN** a client calls a generic text or image proxy outside the backend Playground
- **THEN** the system does not create a Playground history record automatically

### Requirement: Text and image attempt details

The system SHALL record successful and failed Playground text and image attempts with the prompt, model, task kind, status, duration, server timestamp, replayable basic parameters, and a lightweight result or sanitized error.

#### Scenario: Text generation succeeds

- **WHEN** a Playground text request succeeds
- **THEN** history records its prompt, model, System Prompt settings, generated text, duration, success status, and creation time

#### Scenario: Image generation succeeds

- **WHEN** a synchronous or asynchronous Playground image request succeeds
- **THEN** history records its prompt, model, size, selected call mode, generated image result URLs, revised prompts, optional job ids, duration, success status, and creation time
- **AND** history does not persist generated image binaries or base64 payloads

#### Scenario: Generation fails

- **WHEN** a Playground text or image request fails
- **THEN** history records the replayable request parameters, duration, failed status, and sanitized error text

#### Scenario: Image edit uses reference files

- **WHEN** a Playground image request includes uploaded reference images
- **THEN** history records the reference file names for context
- **AND** history does not persist the uploaded file bytes

### Requirement: Bounded chronological history listing

The system SHALL list Playground history newest first through a bounded paginated API.

#### Scenario: Account has more records than one page

- **WHEN** the account requests the first history page
- **THEN** the system returns at most the configured page limit in reverse chronological order
- **AND** the response indicates how to request the next page when more records exist

### Requirement: Confirmed replay through form refill

The Playground SHALL provide a “再次发起” action that restores a history record into the matching form without automatically making a generation request.

#### Scenario: Replay a text task

- **WHEN** the user chooses “再次发起” on a text history record
- **THEN** Playground activates the text form and refills its prompt, model, and System Prompt settings
- **AND** no network generation request is sent until the user submits the form

#### Scenario: Replay an image task

- **WHEN** the user chooses “再次发起” on an image history record
- **THEN** Playground activates the image form and refills its prompt, model, size, and sync/async mode
- **AND** no network generation request is sent until the user submits the form

#### Scenario: Replay an image-edit task

- **WHEN** the user chooses “再次发起” on an image history record that used reference files
- **THEN** Playground shows the prior reference file names as context
- **AND** requires the user to select reference files again before submitting
