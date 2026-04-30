## 1. Routing And Planning

- [x] 1.1 Add `openai.images.edits` protocol support.
- [x] 1.2 Add `openai.image.gpt-edit-form` binding inference for official GPT Image profiles.
- [x] 1.3 Add planner schema preference support.
- [x] 1.4 Keep basic compatibility profiles on `openai.image.basic-json`.

## 2. Adapter Request Model

- [x] 2.1 Add image generation mode and edit-specific request fields.
- [x] 2.2 Extend GPT Image adapter to build `/images/edits` multipart form bodies.
- [x] 2.3 Parse edit responses through the existing GPT Image response parser.
- [x] 2.4 Keep `/images/generations` behavior unchanged.

## 3. Execution Flow

- [x] 3.1 Detect reference-image/edit requests in `GenerationAPIService`.
- [x] 3.2 Prefer `openai.image.gpt-edit-form` for official GPT profiles when edit inputs are present.
- [x] 3.3 Fall back to existing binding selection when edit schema is unavailable.

## 4. Tests

- [x] 4.1 Add routing tests for generation and edit bindings on the same GPT Image model.
- [x] 4.2 Add planner tests for preferred request schema selection and fallback.
- [x] 4.3 Add GPT adapter edit form body tests.
- [x] 4.4 Add execution/adapter-selection tests for reference-image requests.
- [x] 4.5 Add regression coverage proving Tuzi/basic reference-image requests stay on default adapter.

## 5. Verification

- [x] 5.1 Run targeted Vitest tests.
- [x] 5.2 Run formatting/diff checks.
- [x] 5.3 Attempt TypeScript/OpenSpec validation and document unrelated blockers.
