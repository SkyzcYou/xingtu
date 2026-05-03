## Context

> Superseded note: the later `update-image-api-compatibility-modes` change
> refines this design. In current implementation guidance, the legacy
> `tuzi-compatible` value is accepted only as an alias for `tuzi-gpt-image`,
> Tuzi GPT Image routes through the dedicated Tuzi GPT Image adapter, and
> `openai-compatible-basic` remains the generic fallback/default adapter path.

The project already has multi-provider concepts:

- `ProviderProfile` stores the API key, base URL, provider type, and auth mode.
- `ModelRef` stores `profileId + modelId`.
- `ProviderModelBinding` stores `profileId + modelId + operation + protocol + requestSchema`.
- The model adapter registry already prefers `requestSchema` matches over protocol and model matches.

This gives the system enough structure to solve the GPT Image compatibility issue without binding every `gpt-image-*` model directly to one adapter.

## Goals / Non-Goals

- Goals:
  - Allow the same GPT Image model ID to route differently by provider profile/key.
  - Preserve the current default adapter compatibility path.
  - Add a dedicated official GPT Image generation path.
  - Keep the user-facing configuration understandable.
  - Keep this change smaller than the full image operation abstraction.
- Non-Goals:
  - No new image edit task type.
  - No new public `edit_image` tool.
  - No automatic paid request fallback/retry across compatibility modes.
  - No provider-wide rewrite of all image adapters.

## Decisions

- Decision: Store compatibility on `ProviderProfile`.

  The compatibility difference is caused by the API key/profile, not by the model ID alone. The profile is therefore the right place for this setting.

- Decision: Name the field `imageApiCompatibility`.

  The field describes the upstream image API contract. It does not expose internal adapter or schema names to users.

- Decision: Use user-facing values that map to internal schemas.

  ```ts
  type ImageApiCompatibility =
    | 'auto'
    | 'openai-gpt-image'
    | 'tuzi-compatible'
    | 'openai-compatible-basic';
  ```

- Decision: Keep `auto` as a stored value.

  `auto` should not be rewritten into a concrete mode during normalization. Runtime inference can evolve later while existing profiles continue to benefit from better inference rules.

- Decision: Resolve compatibility before binding inference.

  The binding layer maps the resolved compatibility to a `requestSchema`. The adapter registry then selects the implementation by schema.

## Architecture Overview

This change adds a narrow compatibility-selection layer between provider profile resolution and image binding inference.

Runtime flow:

```text
Image request
  -> ModelRef(profileId + modelId)
  -> ProviderProfile
  -> imageApiCompatibility
  -> resolved image compatibility
  -> ProviderModelBinding.requestSchema
  -> model adapter registry
  -> default image adapter OR GPT Image adapter
  -> ProviderTransport
```

The important architectural boundary is that `modelId` identifies what the user selected, while `imageApiCompatibility` describes the request contract exposed by the chosen API key/profile.

### Data Model

Add a profile-level field:

```ts
type ImageApiCompatibility =
  | 'auto'
  | 'openai-gpt-image'
  | 'tuzi-compatible'
  | 'openai-compatible-basic';

interface ProviderProfile {
  imageApiCompatibility?: ImageApiCompatibility;
}
```

Propagate the same field into `ProviderProfileSnapshot` because binding inference operates on snapshots rather than full settings objects.

### Request Schema Contract

The request schema is the stable handoff between routing and adapters:

```text
openai.image.basic-json
  -> existing default image adapter

openai.image.gpt-generation-json
  -> new GPT Image adapter
```

The adapter registry already scores `requestSchema` matches above protocol and model matches. This change relies on that behavior so official GPT Image requests are not selected by bare model ID alone.

### Module Responsibilities

- `settings-manager.ts`
  - Owns the persisted profile field and normalization.
  - Keeps missing values as `auto`.
- `settings-dialog.tsx`
  - Lets users choose the profile's image interface format.
  - Shows user-facing labels only.
- `provider-routing/types.ts`
  - Adds the field to `ProviderProfileSnapshot`.
- `provider-routing/settings-repository.ts`
  - Copies the field from settings profiles into snapshots.
- `provider-routing/binding-inference.ts`
  - Resolves `auto` to a concrete compatibility mode.
  - Maps the resolved mode to `requestSchema`.
- `model-adapters/gpt-image-adapter.ts`
  - Implements official GPT Image generation request and response handling.
- `model-adapters/default-adapters.ts`
  - Continues to serve Tuzi/basic and generic OpenAI-compatible image formats.

## Compatibility Resolution

Manual values win over `auto`.

Recommended `auto` inference:

- `api.openai.com` + `gpt-image*` -> `openai-gpt-image`
- `api.tu-zi.com` -> `tuzi-compatible`
- other `openai-compatible` or `custom` profiles -> `openai-compatible-basic`
- `gemini-compatible` profiles do not use GPT Image routing

## Request Schema Mapping

- `openai-gpt-image` + GPT Image model:
  - `requestSchema: openai.image.gpt-generation-json`
  - adapter: `gpt-image-adapter`
- `tuzi-gpt-image`:
  - `requestSchema: tuzi.image.gpt-generation-json`
  - adapter: `tuzi-gpt-image-adapter`
- `openai-compatible-basic`:
  - `requestSchema: openai.image.basic-json`
  - adapter: existing default image adapter

Official edit support uses:

- `openai.image.gpt-edit-form`

## Adapter Boundaries

The existing default adapter remains the compatibility path for generic OpenAI-compatible image providers. Tuzi GPT Image-specific behavior belongs to the dedicated Tuzi GPT Image adapter.

The new GPT Image adapter only handles official GPT Image request schemas. It should not match every `gpt-image-*` model by model ID alone.

Initial GPT Image adapter scope:

- POST `/images/generations`
- Do not default `response_format` to `url`
- Prefer `b64_json` parsing
- Accept URL responses for gateway compatibility
- Support official generation fields such as `size`, `quality`, `n`, `output_format`, `output_compression`, `background`, and `moderation` when present

### GPT Image Adapter Request Policy

The adapter should only include optional fields when the caller provided them or when the project already has a safe default for that official field.

It should not:

- inject `response_format: url` by default
- add provider-specific prompt prefixes
- use the basic compatibility `image` field for official edit semantics

It should:

- POST official text-to-image requests to `/images/generations`
- prefer `b64_json` response data
- tolerate URL responses from gateway variants
- normalize returned images to the existing `ImageGenerationResult`

### Default Adapter Policy

The default image adapter remains the compatibility adapter for:

- `tuzi-compatible`
- `openai-compatible-basic`
- unknown or broad OpenAI-compatible image gateways

Its existing GPT Image behavior is preserved to protect current users and API keys.

## Settings UI

Add a profile-level field near provider type / API URL / API key:

Label: `图片接口格式`

Options:

- `自动`
- `OpenAI GPT Image 格式`
- `兔子兼容格式`
- `通用 OpenAI 兼容格式`

Suggested helper text:

`同一个图片模型在不同 API Key 或网关下可能需要不同接口格式；不确定时使用自动。`

The UI should not mention adapters, request schemas, or routing internals.

## Observability

Generation diagnostics should expose enough non-secret context to debug misrouting:

- `profileId`
- `modelId`
- stored `imageApiCompatibility`
- resolved compatibility
- `requestSchema`
- adapter ID
- submit path

API keys and full authorization headers must never be logged.

## Migration

- Old profiles without `imageApiCompatibility` normalize to `auto`.
- Legacy default and managed Tuzi profiles should store `auto`.
- At runtime, `auto` for `api.tu-zi.com` resolves to `tuzi-compatible`, preserving current behavior.
- Copying a provider profile should copy the field.
- Deleting or disabling profiles requires no special handling.

## Risks

- `auto` inference may choose the wrong compatibility mode for a key.
- The adapter registry may accidentally select the default adapter if schema matching is incomplete.
- Default adapter changes may break existing Tuzi/basic image keys.
- Official GPT Image and gateway variants may return mixed response shapes.
- The UI setting may be unclear without concise helper text.
- Future `/images/edits` support may need a broader image operation abstraction.

## Rollout Plan

1. Add data model support and keep all existing profiles resolving to current behavior.
2. Add routing/schema split while defaulting Tuzi/basic profiles to the existing adapter.
3. Add GPT Image generation adapter and route only `openai-gpt-image` profiles to it.
4. Add UI controls and observability.
5. Add tests and manually verify two profiles with the same GPT model ID but different compatibility modes.

## Open Questions For Approval

- Should `api.tu-zi.com` always resolve to `tuzi-compatible` in `auto` mode?
- Should the first implementation include only `/images/generations`, or also `/images/edits`?
- Should `openai-compatible-basic` and `tuzi-compatible` remain separate user options even if they initially map to the same request schema?
