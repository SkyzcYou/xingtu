## 1. Data Model

- [x] 1.1 Add PPT slide transition types and sanitization helpers.
- [x] 1.2 Extend `PPTFrameMeta` with optional transition metadata.

## 2. Editor UI

- [x] 2.1 Add a right-click animation/transition submenu for single PPT pages.
- [x] 2.2 Show the currently selected transition in the submenu.
- [x] 2.3 Persist transition changes through `setFramePPTMeta`.

## 3. Playback

- [x] 3.1 Make `FrameSlideshow` read per-page transition metadata.
- [x] 3.2 Apply matching lightweight CSS transition effects when navigating pages.
- [x] 3.3 Respect reduced-motion preferences by falling back to no animation.

## 4. PPTX Export

- [x] 4.1 Change PPT export to produce a Blob/ArrayBuffer before download.
- [x] 4.2 Patch generated slide XML with transition tags for supported transition types.
- [x] 4.3 Preserve existing export behavior when no transitions are configured.

## 5. Tests

- [x] 5.1 Add unit tests for transition metadata normalization.
- [x] 5.2 Add unit tests for PPTX transition XML injection.
- [x] 5.3 Run targeted PPT tests and a focused typecheck if feasible.
