## ADDED Requirements

### Requirement: Internal Generation Context Selection
The system SHALL allow supported internal generation tools to select knowledge-base notes as context for the current generation request.

#### Scenario: Select notes for the current request
- **GIVEN** the user is using an internal generation tool that supports generation context
- **WHEN** the user selects one or more knowledge-base notes
- **THEN** the tool SHALL attach those notes as current-request context
- **AND** the selected context SHALL be visible and removable before submission

#### Scenario: Keep context scoped to the request
- **GIVEN** the user has selected knowledge-base notes for one generation request
- **WHEN** the request is submitted
- **THEN** the system SHALL pass the selected note refs with that request
- **AND** it SHALL NOT implicitly apply them to unrelated future requests unless the user selects them again

### Requirement: Lightweight Context References
The system SHALL persist only lightweight references for selected knowledge-base context.

#### Scenario: Store selected context refs
- **WHEN** a generation request or task stores selected knowledge-base context
- **THEN** it SHALL store lightweight refs such as note id, title snapshot, and updated-at snapshot
- **AND** it SHALL NOT store full note bodies, embedded media payloads, base64 data, or large serialized markdown in durable task state

### Requirement: On-Demand Context Loading
The system SHALL read selected knowledge-base notes on demand during generation execution and bound the content added to prompts.

#### Scenario: Load context at execution time
- **GIVEN** a generation task contains knowledge-base note refs
- **WHEN** the task starts execution
- **THEN** the executor SHALL read the latest available note content for those refs
- **AND** it SHALL combine the readable content with the user prompt before calling the provider

#### Scenario: Truncate oversized context
- **GIVEN** selected knowledge-base notes exceed the configured context budget
- **WHEN** the executor prepares the provider prompt
- **THEN** it SHALL truncate or omit excess context deterministically
- **AND** it SHALL avoid loading or concatenating unbounded note content in memory

### Requirement: Missing Context Degradation
The system SHALL degrade gracefully when selected knowledge-base context is empty, deleted, or unreadable.

#### Scenario: Empty note is selected
- **GIVEN** a selected knowledge-base note has no usable text content
- **WHEN** generation execution prepares context
- **THEN** the executor SHALL skip that note
- **AND** it SHALL continue generation with the remaining context and user prompt

#### Scenario: Note was deleted or cannot be read
- **GIVEN** a generation task references a note that no longer exists or cannot be read
- **WHEN** the task starts execution
- **THEN** the executor SHALL skip the unavailable note
- **AND** it SHALL continue generation instead of failing solely because that context is unavailable

### Requirement: External Iframe Tool Exclusion
The system SHALL NOT expose knowledge-base generation context selection for external iframe tools such as Chat-MJ.

#### Scenario: Open Chat-MJ iframe tool
- **GIVEN** the user opens Chat-MJ or another external iframe generation tool
- **WHEN** the tool UI is rendered
- **THEN** the system SHALL NOT show the knowledge-base context selector in that iframe tool
- **AND** it SHALL NOT attempt to inject selected note content into the external iframe request
