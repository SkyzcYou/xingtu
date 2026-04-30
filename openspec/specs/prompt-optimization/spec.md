# prompt-optimization Specification

## Purpose
TBD - created by archiving change refactor-prompt-optimization-public-capability. Update Purpose after archive.
## Requirements
### Requirement: Scenario-Based Prompt Optimization
The system SHALL route prompt optimization through a shared scenario registry that defines the optimization type, default mode, history bucket, display name, and built-in template for each supported entrypoint.

#### Scenario: Existing entrypoints use distinct scenarios
- **WHEN** a user opens prompt optimization from AI input, image/video tools, PPT outline prompts, or music creation
- **THEN** the optimizer uses the scenario assigned to that entrypoint rather than only the broad generation type

### Requirement: Knowledge Base Template Overrides
The system SHALL store prompt optimization templates as editable Knowledge Base notes in a "提示词优化" directory and prefer those note contents over built-in templates.

#### Scenario: User edits a template note
- **WHEN** the template note for a scenario has non-empty user-edited content
- **THEN** future optimizations for that scenario use the edited content

#### Scenario: Template note is missing or empty
- **WHEN** the directory or scenario note is missing, or the note content is empty
- **THEN** the system restores the built-in default template and continues optimization

### Requirement: Required Runtime Inputs
The system SHALL append the original prompt and supplemental requirements to every optimization request outside of the editable template content.

#### Scenario: Template omits variables
- **WHEN** a user-edited template does not include `{{originalPrompt}}` or `{{requirements}}`
- **THEN** the optimization request still contains the original prompt and requirements in a system-controlled input block

### Requirement: Shared Prompt Optimization UI
The system SHALL provide a shared prompt optimization button that opens the shared dialog, supports tooltip placement and styling overrides, and fills optimized prompts back to the caller.

#### Scenario: Caller applies optimized prompt
- **WHEN** the user applies an optimized draft from the dialog
- **THEN** the caller receives the optimized prompt through its existing fill-back handler

