## 1. Implementation
- [x] 1.1 Extend PPT frame metadata for whole-slide prompt, slide image id/url, and generation status with fallback from old `imagePrompt`.
- [x] 1.2 Add frame image helpers to find, mark, insert, and replace the primary PPT slide image without duplicating large image data.
- [x] 1.3 Refactor topic/mindmap PPT generation to create Frame pages and submit/generate one 16:9 whole-slide image per page.
- [x] 1.4 Update PPT prompts so each page prompt asks for a complete presentation slide with readable in-image text.
- [x] 1.5 Rename the Frame tab/user copy to PPT editing while keeping generic Frame list compatibility.
- [x] 1.6 Replace Frame list rows with slide preview cards for PPT frames, using lazy image thumbnails from the current slide image URL.
- [x] 1.7 Remove PPT background image controls and single-page PPT export actions from the PPT editing panel.
- [x] 1.8 Add per-page “重新生成” action that opens AI image generation with prompt, current slide image reference, target Frame, and auto-insert replacement options.
- [x] 1.9 Update AI image task params and `useAutoInsertToCanvas` to replace the marked PPT slide image only after successful insertion.
- [x] 1.10 Keep full-deck PPT export ordered by Frame order and verify image-first pages export as expected.

## 2. Tests
- [x] 2.1 Add unit tests for PPT metadata fallback and slide image helper behavior.
- [x] 2.2 Add/adjust tests for PPT generation output: one Frame per page and one primary slide image target per page.
- [x] 2.3 Add/adjust tests for auto-insert replacement so success replaces old image and failure preserves it.
- [x] 2.4 Run targeted PPT/image-generation tests, then run a broader affected package test command if feasible.
