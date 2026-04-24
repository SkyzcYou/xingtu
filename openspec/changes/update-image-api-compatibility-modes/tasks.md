## 1. Proposal And Validation

- [x] 1.1 Review `add-gpt-image-profile-compatibility` and `add-gpt-image-edit-support` for overlap and migration impact.
- [ ] 1.2 Validate `update-image-api-compatibility-modes` with OpenSpec tooling when the CLI is available.
- [ ] 1.3 Approve the internal compatibility model before implementation starts.

## 2. Settings And Migration

- [x] 2.1 Extend `ImageApiCompatibility` to include `tuzi-gpt-image`.
- [x] 2.2 Accept legacy `tuzi-compatible` values and normalize them to `tuzi-gpt-image`.
- [x] 2.3 Preserve stored `auto` values and confirm they continue to resolve correctly for historical OpenAI profiles.
- [x] 2.4 Preserve `openai-compatible-basic` for rollback and generic gateway scenarios.
- [x] 2.5 Ensure snapshot, copy, import, and export flows preserve the compatibility field.

## 3. Routing Contract

- [x] 3.1 Update compatibility resolution so `auto` resolves to `openai-gpt-image`, `tuzi-gpt-image`, or `openai-compatible-basic`.
- [x] 3.2 Keep non-GPT image model routing unchanged.
- [x] 3.3 Add a dedicated Tuzi GPT generation request schema such as `tuzi.image.gpt-generation-json`.
- [x] 3.4 Route official GPT edit bindings only for the official GPT compatibility mode.
- [x] 3.5 Ensure resolved compatibility and request schema stay aligned in metadata and logs.

## 4. Adapter Ownership Cleanup

- [x] 4.1 Add `tuzi-gpt-image-adapter.ts`.
- [x] 4.2 Move GPT-specific Tuzi translation logic out of `default-adapters.ts`.
- [x] 4.3 Keep `gpt-image-adapter` responsible only for official GPT request schemas.
- [x] 4.4 Keep the default/basic adapter as the generic fallback for `openai-compatible-basic`.
- [x] 4.5 Reuse the shared size/quality resolver where helpful, but keep official and Tuzi contract semantics separate.

## 5. UI And Diagnostics

- [x] 5.1 Simplify the main profile UI to emphasize `OpenAI GPT Image` and `Tuzi GPT 兼容`.
- [x] 5.2 Show a resolved summary when a profile remains on `auto`.
- [x] 5.3 Keep hidden or advanced fallback modes round-trippable for legacy profiles.
- [x] 5.4 Expose enough debug information to understand stored mode, resolved mode, request schema, and adapter selection without leaking secrets.

## 6. Defaults And Migration Guardrails

- [ ] 6.1 Default newly created provider profiles to `openai-gpt-image`.
- [ ] 6.2 Default built-in managed provider profiles to `openai-gpt-image` when no stored override exists.
- [ ] 6.3 Preserve explicit stored compatibility values when managed profiles are rebuilt or reopened.
- [ ] 6.4 Upgrade only missing compatibility fields to `openai-gpt-image`, while preserving explicit custom-profile `auto`.
- [ ] 6.5 Update settings UI hints or labels so `OpenAI GPT Image` is clearly the recommended default without removing `auto`.

## 7. Phase 1 Verification

- [x] 7.1 Add routing tests proving the same `gpt-image-*` model can route to official GPT, Tuzi GPT, or generic fallback depending on profile.
- [x] 7.2 Add adapter-selection tests proving `tuzi-gpt-image` no longer lands on the generic default adapter.
- [x] 7.3 Add request serialization tests for official GPT generation/edit and Tuzi GPT generation.
- [x] 7.4 Add migration tests for `auto`, `tuzi-compatible`, and `openai-compatible-basic`.
- [x] 7.5 Run targeted Vitest coverage for provider routing, settings normalization, adapters, task persistence, and MCP image generation.
- [ ] 7.6 Add regression tests for new-profile defaults, managed-profile defaults, managed-profile override persistence, and explicit custom-profile `auto` preservation.

## 8. Phase 2 Follow-Up

- [x] 8.1 Define the Tuzi GPT edit contract and dedicated request schema.
- [x] 8.2 Route Tuzi GPT edit requests through `tuzi-gpt-image-adapter`.
- [x] 8.3 Extend edit-path persistence, planner preference, and regression tests once the Tuzi edit contract is finalized.
