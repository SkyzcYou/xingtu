# Change: Add PPT slide transitions

## Why

PPT pages currently play and export as immediate cuts. Users need per-page transition choices that feel close to PowerPoint, apply during in-app playback, and survive PPTX download.

## What Changes

- Add per-PPT-page transition metadata to Frame PPT data.
- Add an animation/transition submenu to the single-page PPT right-click menu with hover-revealed transition choices.
- Apply the selected page transition during `FrameSlideshow` playback.
- Export selected transitions into downloaded PPTX files by post-processing generated OOXML, because `pptxgenjs` does not expose a slide transition API.
- Keep scope to slide/page transitions; element-level entrance/emphasis animations are out of scope for the current image-first PPT model.

## Impact

- Affected specs: `ppt-editing`
- Affected code:
  - `packages/drawnix/src/services/ppt/ppt.types.ts`
  - `packages/drawnix/src/components/project-drawer/FramePanel.tsx`
  - `packages/drawnix/src/components/project-drawer/FrameSlideshow.tsx`
  - `packages/drawnix/src/services/ppt/ppt-export-service.ts`
  - PPT-related tests
