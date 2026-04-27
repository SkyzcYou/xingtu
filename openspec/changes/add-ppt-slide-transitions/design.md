## Context

The current PPT editor uses an image-first model: each slide is a Frame whose primary content is a full-slide image plus light `pptMeta`. This maps naturally to PowerPoint slide transitions, but not to element-level animation.

`pptxgenjs@4.0.1` does not expose a slide transition API, so exported PPTX transition support requires writing transition XML into `ppt/slides/slideN.xml` after generation.

## Goals

- Store transition configuration per PPT page without duplicating media data.
- Offer a right-click submenu that is quick to scan and works via hover.
- Make in-app slideshow playback honor the selected transition.
- Make downloaded PPTX files contain matching slide transition metadata.
- Keep memory usage bounded for high-page-count decks.

## Non-Goals

- Element-level animation such as text fly-in, object emphasis, or path animation.
- New dependency-heavy PPT generation pipeline.
- Auto-advance timing unless added in a later change.

## Decisions

- Use a small enum-like `PPTSlideTransitionType` with PowerPoint-aligned names: none, fade, push, wipe, split, cover, uncover.
- Store transition data on `PPTFrameMeta.transition` with a duration in milliseconds.
- Apply playback effects as CSS transforms/opacity on a lightweight overlay around the visible Frame area.
- Export transitions by generating a Blob/ArrayBuffer from `pptxgenjs`, loading it through the existing `jszip` dependency, patching slide XML, then triggering the same download behavior.
- Treat unsupported or malformed transition metadata as `none`.

## Risks / Trade-offs

- OOXML transition tags can vary across PowerPoint/WPS/Keynote. Keep the initial transition set small and test generated XML directly.
- PPTX post-processing holds the generated PPTX zip in memory. Avoid additional image decoding or full-slide rasterization during this phase.
- In-app CSS playback can approximate PowerPoint transitions but will not be pixel-perfect for every office suite.

## Validation

- Unit test transition sanitization and XML injection.
- Targeted PPT export test verifies generated slide XML contains expected transition tags.
- Manual browser check verifies right-click hover submenu, metadata persistence, and slideshow transition playback.
