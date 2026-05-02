# Change: Add PDF-backed prompt start for popular video

## Why
The popular video tool currently starts from an uploaded video or YouTube URL. Users also need to start from a creative prompt and optional PDF context, then continue through the same script editing and video generation workflow.

## What Changes
- Add a prompt-generation input mode before the existing upload video mode in the popular video analysis step.
- Reuse the existing Gemini `TaskType.CHAT` PDF inline-data path from the multi-image tool, avoiding a separate PDF parser or storage entity.
- Generate a `VideoAnalysisData`-compatible script plan from user prompt plus optional PDF context so the existing Script and Generate pages can continue unchanged.
- Persist only lightweight prompt/PDF source metadata and cache references needed for pending or repeatable tasks.

## Impact
- Affected specs: `video-analyzer`
- Affected code: `video-analyzer` Analyze page/types/utils/task sync, `task-queue-service` chat action routing, focused tests
