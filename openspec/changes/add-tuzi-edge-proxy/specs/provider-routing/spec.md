## ADDED Requirements

### Requirement: Trusted Tuzi Requests SHALL Use a Bounded Same-Origin Proxy in Browser Deployments

The system SHALL route requests for allowlisted Tuzi provider origins through the deployment's same-origin proxy when running in the Xingtu browser application, while leaving non-Tuzi custom providers direct.

#### Scenario: Trusted Tuzi model request uses an alias
- **GIVEN** a provider base URL is one of the allowlisted Tuzi origins
- **WHEN** the browser prepares a provider request
- **THEN** the network URL SHALL use the Xingtu same-origin proxy and a fixed upstream alias
- **AND** the request path and query SHALL be preserved
- **AND** the Authorization header SHALL be retained

#### Scenario: Custom provider remains direct
- **GIVEN** a provider base URL is not an allowlisted Tuzi origin
- **WHEN** the browser prepares a provider request
- **THEN** the request SHALL use the configured provider origin directly
- **AND** the Tuzi proxy SHALL not receive the request

#### Scenario: Arbitrary proxy target is rejected
- **WHEN** a browser request includes an unknown upstream alias or attempts to provide a target URL
- **THEN** the edge proxy SHALL reject the request
- **AND** SHALL NOT make a request to the supplied arbitrary target
