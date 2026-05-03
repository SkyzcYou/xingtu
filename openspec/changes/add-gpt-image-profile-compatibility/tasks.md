## 1. Proposal And Design

- [x] 1.1 Review existing provider routing and image generation specs/changes for conflicts.
- [ ] 1.2 Validate this change with `openspec validate add-gpt-image-profile-compatibility --strict`.
- [x] 1.3 Get approval before implementation.

Note: `openspec` CLI is not available in the current shell, so 1.2 remains unchecked.

## 2. Settings Data Model

- [x] 2.1 Add `ImageApiCompatibility` type and `ProviderProfile.imageApiCompatibility`.
- [x] 2.2 Add the field to `ProviderProfileSnapshot`.
- [x] 2.3 Update provider profile normalization to preserve valid values and coerce missing/invalid values to `auto`.
- [x] 2.4 Ensure legacy default and managed Tuzi profiles store `auto`.
- [x] 2.5 Ensure `auto` for Tuzi profiles resolves to the existing compatibility path at runtime.
- [x] 2.6 Ensure profile copy/update paths preserve the field.

## 3. Compatibility Resolution And Routing

- [x] 3.1 Add a resolver for profile image API compatibility, including `auto` inference.
- [x] 3.2 Add GPT Image model detection that does not force all GPT Image models to one adapter by model ID.
- [x] 3.3 Update image binding inference to emit `openai.image.gpt-generation-json` for official GPT Image generation.
- [x] 3.4 Keep `tuzi-compatible` and `openai-compatible-basic` on `openai.image.basic-json`.
- [x] 3.5 Ensure same `modelId` under different `profileId` can produce different request schemas.
- [x] 3.6 Keep non-GPT image model bindings unchanged.

## 4. GPT Image Adapter

- [x] 4.1 Add `gpt-image-adapter.ts`.
- [x] 4.2 Match only GPT Image official request schemas, not every GPT model ID.
- [x] 4.3 Build official `/images/generations` requests without defaulting `response_format` to `url`.
- [x] 4.4 Support official generation fields only when present or safely defaulted.
- [x] 4.5 Parse `b64_json`, `url`, data URL, and gateway base64 variants into the existing image result shape.
- [x] 4.6 Register the adapter without changing MJ, Flux, Seedream, or default adapter behavior.

## 5. Settings UI

- [x] 5.1 Add the `图片接口格式` select to the provider settings form.
- [x] 5.2 Place the field near provider type / API URL / API key.
- [x] 5.3 Use user-facing labels for automatic, OpenAI GPT Image, Tuzi-compatible, and generic OpenAI-compatible formats.
- [x] 5.4 Add concise helper text explaining why the setting is profile/key scoped.
- [x] 5.5 Avoid exposing adapter or request schema names in UI copy.

## 6. Observability

- [x] 6.1 Log or expose debug context for `profileId`, resolved image compatibility, `requestSchema`, adapter ID, and submit path.
- [x] 6.2 Include stored compatibility and resolved compatibility separately when possible.
- [x] 6.3 Ensure logs do not expose API keys.

## 7. Tests

- [x] 7.1 Add binding inference tests for the same `gpt-image-*` model under different profiles.
- [x] 7.2 Add adapter registry tests for GPT schema vs basic schema selection.
- [x] 7.3 Add default adapter regression tests for existing Tuzi/basic request bodies.
- [x] 7.4 Add GPT adapter request and response parsing tests.
- [x] 7.5 Add service-level integration tests from generation request to selected adapter/transport.
- [x] 7.6 Add minimal regression coverage for MJ, Flux, Seedream, and non-GPT OpenAI-compatible image models.

## 8. Manual Verification

- [ ] 8.1 Create one `tuzi-gpt-image` profile and one `openai-gpt-image` profile that both select `gpt-image-2`.
- [ ] 8.2 Verify text-to-image produces different schema/body/adapter paths for those profiles.
- [ ] 8.3 Verify generated results still enter task history, media library, and canvas insertion normally.
- [ ] 8.4 Verify switching an affected profile to `openai-compatible-basic` restores the default adapter path.

## 9. Rollout And Rollback

- [ ] 9.1 Release with existing profiles defaulting to `auto`.
- [ ] 9.2 Confirm Tuzi `auto` resolves to the dedicated Tuzi GPT Image adapter path.
- [ ] 9.3 Document that users can manually switch a profile back to `通用 OpenAI 兼容格式`.
- [ ] 9.4 Keep the default adapter path available as the first rollback option.
