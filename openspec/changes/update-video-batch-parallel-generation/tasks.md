## 1. Implementation
- [x] 1.1 Update MV creator batch generation to launch independent per-shot pipelines in parallel.
- [x] 1.2 Update popular video batch generation to launch independent per-shot pipelines in parallel.
- [x] 1.3 Ensure each pipeline generates or reuses a first frame before submitting that shot's video task.
- [x] 1.4 Remove batch-time dependency on previous shot tail frames.
- [x] 1.5 Update batch progress/status copy from serial index semantics to parallel completion semantics.

## 2. Verification
- [x] 2.1 Run targeted TypeScript/lint checks for the changed generation pages.
- [x] 2.2 Run or add focused tests for shared generation helpers if an extractable helper is introduced.
- [x] 2.3 Manually inspect no large image/video binaries are buffered in the new orchestration.
