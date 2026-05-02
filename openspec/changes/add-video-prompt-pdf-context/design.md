## Context
The multi-image tool already supports PDF context by caching the uploaded PDF and passing `pdfCacheUrl`, `pdfMimeType`, and `pdfName` into a `TaskType.CHAT` task. `TaskQueueService.buildChatInlineDataParts()` converts that cached PDF to Gemini `inline_data`, so the new popular-video flow should reuse this path instead of introducing a PDF extraction service.

The popular video tool stores workflow records as `AnalysisRecord` and downstream pages expect `analysis: VideoAnalysisData`. A prompt-based start can therefore create the same analysis shape without a source video.

## Goals
- Add a first tab/input mode named `提示词生成` before `上传视频`.
- Let users enter a creative prompt and optionally upload a PDF as Gemini context.
- Submit prompt generation through the unified task queue.
- Store the result as a normal popular-video record so Script and Generate pages keep working.
- Avoid persisting PDF base64 or full provider responses in history.

## Non-Goals
- No new PDF parser or backend endpoint.
- No new storage table/entity.
- No changes to video generation semantics after the script is created.

## Design
Extend the video analyzer task action from `analyze | rewrite` to include a prompt-generation action, for example `prompt-generate`. The task params carry:
- `prompt`: short task label for queue display
- `videoAnalyzerPrompt`: full Gemini instruction
- `videoAnalyzerAction: 'prompt-generate'`
- `videoAnalyzerSource: 'prompt'`
- optional `pdfCacheUrl`, `pdfMimeType`, `pdfName`

The task queue routes this action through the normal text generation path with `buildChatInlineDataParts()`, then finalizes the task with both markdown preview and structured `VideoAnalysisData`. Task sync creates an `AnalysisRecord` with `source: 'prompt'`, a prompt source label, and a lightweight source snapshot containing prompt text plus optional PDF metadata/cache reference.

Prompt generation should instruct Gemini to return the same JSON contract as video analysis: total duration, aspect ratio, style, BGM mood, characters, and ordered shots with first/last frame prompts, narration/dialogue, camera movement, and transitions. This keeps existing script editing, versioning, and video generation surfaces compatible.

## Error Handling
- Reject non-PDF uploads and PDFs above the existing multi-image limit.
- If a PDF is attached but no Gemini text model is available, show the same style of warning as the multi-image tool.
- If a cached PDF cannot be read while the task runs, fail the queue task with a clear message.
- If Gemini returns invalid JSON, mark the task failed and keep the current form state.

## Performance
The PDF remains a cached Blob reference until the task executes. Conversion to base64 happens only during Gemini submission, matching current multi-image behavior. No new long-lived large strings should be stored in workflow history.
