## ADDED Requirements

### Requirement: Trusted Tuzi Image Submission and Recovery SHALL Share the Same-Origin Proxy

The system SHALL route trusted Tuzi image submission and recovery requests through the same bounded browser proxy used for model discovery.

#### Scenario: Image submission preserves the provider contract
- **GIVEN** a trusted Tuzi image binding uses JSON or multipart input
- **WHEN** the image adapter submits the request
- **THEN** the proxy SHALL preserve the method, request body, content type, authorization, request ID, and upstream path

#### Scenario: Recovery polling remains on the proxy
- **GIVEN** a trusted Tuzi image task is recovered with a request ID
- **WHEN** the recovery service polls the result endpoint
- **THEN** the poll request SHALL use the same-origin proxy
- **AND** SHALL preserve the request ID query parameter
