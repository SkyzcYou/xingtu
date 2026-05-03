## ADDED Requirements

### Requirement: AI JSON responses must use shared candidate extraction

When parsing JSON returned by AI/LLM text generation, the system SHALL use a shared candidate extraction utility that supports object and array contracts, Markdown code fences, `<think>` blocks, surrounding prose, and multiple JSON candidates.

#### Scenario: Thinking text contains a mismatched JSON candidate
- **GIVEN** an AI response contains a `<think>` block with a JSON-like candidate that does not match the business schema
- **AND** the final response body contains a valid JSON object that matches the schema predicate
- **WHEN** the business parser extracts the AI JSON response
- **THEN** it selects the matching final JSON object instead of the thinking candidate

#### Scenario: JSON strings contain bracket characters
- **GIVEN** an AI response contains JSON with string values that include `{`, `}`, `[`, or `]`
- **WHEN** the shared extractor scans for balanced candidates
- **THEN** bracket characters inside strings do not terminate or corrupt the candidate

#### Scenario: Non-AI JSON parsing remains unchanged
- **GIVEN** code parses stored settings, backups, sync payloads, or HTTP API bodies
- **WHEN** those payloads are not AI/LLM free-text responses
- **THEN** the system may continue using direct JSON parsing and does not route them through the AI JSON extractor
