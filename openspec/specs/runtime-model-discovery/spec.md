# runtime-model-discovery Specification

## Purpose
TBD - created by archiving change update-model-recommendation-sorting. Update Purpose after archive.
## Requirements
### Requirement: Built-in Model Recommendation Metadata
The system SHALL allow built-in model definitions to carry a static recommendation score used for display prioritization.

#### Scenario: Built-in model has curated recommendation score
- **GIVEN** a built-in model definition is maintained in the static model catalog
- **WHEN** the model config is exposed to selectors or settings views
- **THEN** the model MAY include a recommendation score as part of its metadata
- **AND** the score SHALL be treated as curated display metadata rather than runtime benchmark history

### Requirement: Unified Model Display Ordering
The system SHALL apply one shared ordering strategy across model selectors, settings model lists, and runtime selectable model collections.

#### Scenario: Order models within the same family
- **GIVEN** multiple models belong to the same normalized model family
- **WHEN** the system sorts them for display
- **THEN** it SHALL prioritize newer versions first
- **AND** for equal version priority it SHALL sort by recommendation score in descending order

#### Scenario: Reuse the same ordering in runtime-discovered selector flows
- **GIVEN** a model selector consumes runtime selectable models that combine static and discovered entries
- **WHEN** the selector renders the model list
- **THEN** it SHALL use the same shared ordering strategy as other model display surfaces
- **AND** the ordering SHALL not depend on a selector-specific local sort implementation

