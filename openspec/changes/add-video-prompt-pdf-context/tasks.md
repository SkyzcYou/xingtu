## 1. Implementation
- [x] 1.1 Extend popular-video source/task types to support prompt-based source records and prompt-generation tasks.
- [x] 1.2 Add a video prompt-generation prompt builder that returns `VideoAnalysisData` JSON compatible with the existing workflow.
- [x] 1.3 Add `提示词生成` input mode before `上传视频`, with prompt text, optional PDF upload/removal, model selection, and queue submission.
- [x] 1.4 Route prompt-generation tasks through the existing Gemini chat + PDF inline-data path and finalize structured results.
- [x] 1.5 Sync completed prompt-generation tasks into `AnalysisRecord` history without storing PDF base64.
- [x] 1.6 Add focused tests for prompt builder/parsing, task sync, and PDF task params.

## 2. Verification
- [x] 2.1 Run targeted unit tests for video analyzer utilities/task sync.
- [ ] 2.2 Manually verify prompt-only generation, prompt + PDF generation, invalid PDF, oversized PDF, and history reopen behavior.
