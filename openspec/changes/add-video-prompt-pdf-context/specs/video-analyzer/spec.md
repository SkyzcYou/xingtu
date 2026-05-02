## ADDED Requirements

### Requirement: Popular Video Prompt Start
The popular video tool SHALL allow users to start the workflow from a creative prompt before uploading a source video.

#### Scenario: Generate script plan from prompt
- **WHEN** the user selects the prompt-generation input mode and submits a creative prompt
- **THEN** the system SHALL create a queued text task
- **AND** the completed task SHALL create a popular-video record with `VideoAnalysisData`-compatible shots
- **AND** the user SHALL be able to continue to script editing and video generation without uploading a source video

#### Scenario: Preserve existing source-video starts
- **WHEN** the user selects upload video or YouTube URL
- **THEN** the existing video analysis behavior SHALL remain available
- **AND** the prompt-generation mode SHALL NOT change uploaded-video or YouTube task semantics

### Requirement: Popular Video Prompt Start SHALL Support PDF Context
The prompt-generation input mode SHALL accept an optional PDF context and send it to Gemini with the prompt.

#### Scenario: Submit prompt with PDF context
- **GIVEN** the user uploads a valid PDF in prompt-generation mode
- **WHEN** the user submits prompt generation
- **THEN** the task SHALL include the cached PDF reference and MIME metadata
- **AND** Gemini SHALL receive the PDF as inline context together with the prompt-generation instruction

#### Scenario: Reject invalid PDF context
- **WHEN** the user uploads a non-PDF file or a PDF above the allowed size
- **THEN** the system SHALL reject the file before task submission
- **AND** it SHALL keep the current prompt text intact

#### Scenario: Missing cached PDF during execution
- **GIVEN** a prompt-generation task references a cached PDF
- **WHEN** the cached PDF cannot be read during execution
- **THEN** the task SHALL fail with a clear PDF-read error
- **AND** no partial popular-video record SHALL be created
