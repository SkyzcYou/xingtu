## ADDED Requirements

### Requirement: Browser Model Discovery SHALL Use the Trusted Tuzi Same-Origin Proxy

The system SHALL use the shared Tuzi proxy resolver for `/models` discovery from trusted Tuzi provider profiles in browser deployments.

#### Scenario: Discover models through the proxy
- **GIVEN** a trusted Tuzi profile has a valid API key and a base URL ending in `/v1`
- **WHEN** the settings page refreshes the model list in a browser
- **THEN** the request SHALL target the Xingtu same-origin proxy
- **AND** the response body SHALL be parsed as the provider model list

#### Scenario: Discovery error remains readable
- **WHEN** the upstream returns an authentication or validation error through the proxy
- **THEN** the browser SHALL receive the upstream status and readable error body
- **AND** SHALL not report a synthetic CORS network error
