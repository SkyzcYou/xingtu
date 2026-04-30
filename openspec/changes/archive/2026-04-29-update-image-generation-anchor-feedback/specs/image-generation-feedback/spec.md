## ADDED Requirements

### Requirement: Image Generation SHALL Use Canvas Anchors Instead Of Default Progress Cards

The system SHALL represent image-generation progress in the canvas through lightweight generation anchors instead of default large workflow cards.

#### Scenario: User submits a single image generation request
- **WHEN** the user submits an `image` generation request from the AI input bar
- **THEN** the canvas SHALL show a lightweight generation anchor near the expected insertion location
- **AND** SHALL NOT default to a large progress card for that image request

#### Scenario: Non-image tasks keep existing feedback behavior
- **WHEN** the user submits a non-image generation request
- **THEN** the system MAY continue to use the existing task feedback behavior
- **AND** SHALL NOT be forced into the image anchor presentation model

### Requirement: Image Generation Anchors SHALL Derive Geometry From Submission-Time Signals

The system SHALL determine the image anchor geometry from the strongest available submission-time signals before the final image result is returned.

#### Scenario: Anchor inherits frame geometry
- **GIVEN** the user submits image generation while a target frame is selected
- **AND** the request contains `targetFrameId` and `targetFrameDimensions`
- **WHEN** the anchor is created
- **THEN** the anchor SHALL use the frame geometry as its primary outer shell

#### Scenario: Anchor inherits requested aspect ratio
- **GIVEN** the request has no target frame
- **AND** the request contains a valid `size` ratio
- **WHEN** the anchor is created
- **THEN** the anchor SHALL derive its aspect ratio from that requested size

#### Scenario: Anchor falls back to a ghost anchor
- **GIVEN** the request has no target frame
- **AND** the request has no stable ratio signal
- **WHEN** the anchor is created
- **THEN** the system SHALL create a lightweight ghost anchor instead of a full image frame placeholder

### Requirement: Image Generation SHALL Expose User-Centered Lifecycle States

The system SHALL map image generation into user-centered lifecycle states that prioritize creation continuity over raw workflow details.

#### Scenario: User sees lifecycle progression
- **WHEN** an image generation task progresses from submission to insertion
- **THEN** the UI SHALL express the lifecycle using user-facing states such as `submitted`, `queued`, `generating`, `developing`, `inserting`, `completed`, and `failed`
- **AND** SHALL allow those states to be rendered without exposing the full internal workflow step list in the canvas by default

### Requirement: Completed Images SHALL Replace Anchors With Spatial Continuity

The system SHALL transition from anchor to final image with spatial continuity so the result appears to emerge from the same canvas location.

#### Scenario: Image result is inserted into the canvas
- **WHEN** the image generation result is ready and the insertion flow begins
- **THEN** the final image SHALL take over the anchor location with a continuous visual transition
- **AND** the anchor SHALL fade out after the image is stably inserted

### Requirement: Failed Image Generation SHALL Preserve Contextual Recovery

The system SHALL preserve a contextual recovery point when image generation fails.

#### Scenario: Image generation fails before insertion
- **WHEN** an image generation task fails
- **THEN** the anchor SHALL remain in place as a failure node
- **AND** SHALL expose a retry path without requiring the user to rediscover the original insertion context

### Requirement: Image Generation Anchors SHALL Defer Detailed Execution History To Task Details

The system SHALL keep canvas anchors lightweight and defer detailed execution history to the task detail layer.

#### Scenario: Canvas anchor shows only concise progress context
- **WHEN** an image generation anchor is rendered in the canvas
- **THEN** it SHALL prioritize stage, lightweight progress, and direct recovery actions
- **AND** SHALL NOT default to rendering the full workflow step list inside the canvas object

#### Scenario: Users need detailed failure or history information
- **WHEN** the user requests more detail about an image generation task
- **THEN** the system SHALL provide that information through the task detail layer
- **AND** the anchor MAY offer a navigation affordance without becoming the primary detail container
