## ADDED Requirements

### Requirement: Application UI Hover Tips SHALL Use Shared Hover Components

The system SHALL use `HoverTip` or `HoverCard` for all application UI visual hover tips so that hover guidance follows consistent theme, delay, z-index, pointer behavior, and accessibility behavior.

#### Scenario: Action button shows shared hover tip

- **WHEN** a component needs to display a short hover tip for a button, icon, or status indicator
- **THEN** it SHALL use `HoverTip`
- **AND** SHALL NOT use native `title`, `data-tooltip`, CSS-only tips, or local ad-hoc hover tip implementations

#### Scenario: Rich hover content uses shared hover card

- **WHEN** a component needs hover content with richer layout or pointer continuity
- **THEN** it SHALL use `HoverCard`
- **AND** SHALL NOT create a local hover popover implementation

### Requirement: Interactive Hover Content SHALL Use A Shared Hover Card

The system SHALL provide a shared hover card component for hover content that needs pointer continuity or richer content than a short tip.

#### Scenario: Hover content remains visible across trigger and popup

- **WHEN** the pointer moves from the trigger into the hover popup
- **THEN** the popup SHALL remain open long enough to preserve interaction continuity

#### Scenario: Hover card closes after leaving the interaction region

- **WHEN** the pointer leaves both trigger and popup
- **THEN** the hover card SHALL close after a short unified delay

### Requirement: Component Layer SHALL Block Direct Tooltip Imports

The system SHALL prevent new component code from bypassing the shared hover layer with direct tooltip imports or non-shared application UI hover tips.

#### Scenario: Developer imports Tooltip directly in component code

- **WHEN** component-layer source code imports `Tooltip` from `tdesign-react`
- **THEN** the repository checks SHALL fail
- **AND** the change SHALL be redirected to the shared hover components

#### Scenario: Developer adds a non-shared visual hover tip

- **WHEN** component-layer source code adds native `title`, `data-tooltip`, CSS-only tips, or a local custom hover tip for application UI visual feedback
- **THEN** the repository checks SHALL fail
- **AND** the change SHALL be redirected to `HoverTip` or `HoverCard`

### Requirement: Hover Tip Exceptions SHALL Stay Explicit

The system SHALL allow only documented exceptions where hover metadata belongs to content semantics or an external form component boundary.

#### Scenario: Markdown or user content carries title metadata

- **WHEN** Markdown or user-authored content includes `title` metadata
- **THEN** the system MAY preserve it as content data
- **AND** SHALL NOT treat it as an application UI visual hover tip requirement

#### Scenario: TDesign form tips are used inside form controls

- **WHEN** a TDesign form component exposes built-in form tip behavior within the form API boundary
- **THEN** the system MAY use that form tip behavior
- **AND** SHALL NOT require wrapping it with `HoverTip` or `HoverCard`
