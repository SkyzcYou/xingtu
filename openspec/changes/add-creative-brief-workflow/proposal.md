# Change: Add shared creative brief workflow

## Why
The MV creator and popular video tool currently expose visual style, music mood, duration, and model controls, but they lack a structured creative intent layer. Users need lightweight professional controls for purpose/scene, directing style, narrative style, platform, audience, pacing, and avoid terms so scripts and generation prompts become more targeted.

## What Changes
- Add an optional shared creative brief to existing MV and popular video records without adding a new storage entity.
- Provide reusable creative brief presets and a compact shared editor for MV and popular video script flows.
- Feed the brief into storyboard/script rewrite prompts and single-shot video/frame prompts.
- Fix MV storyboard generation so initial storyboard prompts receive the selected video style and aspect ratio.

## Impact
- Affected specs: `video-analyzer`, `video-mv-workflow-parity`, `video-batch-generation`
- Affected code: workflow shared presets/prompt builders, MV creator pages/utils/types, video analyzer pages/utils/types, targeted tests
