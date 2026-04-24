## Context

The repository now has three distinct realities for GPT Image requests:

- official OpenAI GPT Image requests already route cleanly through dedicated schemas and the `gpt-image-adapter`
- Tuzi GPT compatibility is still encoded as `openai.image.basic-json` and ultimately handled by the generic default image adapter
- generic OpenAI-compatible gateways also use the same basic adapter path

That means `resolvedImageApiCompatibility` is richer than the actual dispatch boundary. The metadata can say `tuzi-compatible`, but the adapter selection still collapses it into the same generic route as every other basic gateway. This makes the current system work, but it keeps provider-specific GPT behavior in the wrong module.

## Goals / Non-Goals

- Goals:
  - keep compatibility decisions profile-scoped
  - keep `auto` as a resolver
  - give Tuzi GPT compatibility a real adapter boundary
  - preserve the current official GPT adapter and schema split
  - preserve `openai-compatible-basic` as the generic fallback
  - separate official GPT quality semantics from legacy basic resolution semantics
  - keep the UI simpler than the internal routing model
- Non-Goals:
  - no full `image.generate` / `image.edit` abstraction yet
  - no new task type
  - no forced removal of existing fallback behavior during rollout
  - no commitment that Tuzi edit uses the same transport shape as official GPT edit

## Decisions

- Decision: Keep image contract selection on `ProviderProfile`.

  The compatibility difference is caused by the selected profile and API key, not by the model ID alone. The contract selector therefore remains a profile-level field.

- Decision: Refine the internal compatibility enum.

  ```ts
  type ImageApiCompatibility =
    | 'auto'
    | 'openai-gpt-image'
    | 'tuzi-gpt-image'
    | 'openai-compatible-basic';
  ```

  Legacy value `tuzi-compatible` is accepted as an alias and normalized to `tuzi-gpt-image`.

- Decision: `auto` is a resolver, not a wire protocol.

  `auto` stays stored on profiles. Runtime resolution maps it to a concrete internal mode based on profile metadata and selected model.

- Decision: `requestSchema` is the adapter dispatch boundary.

  `metadata.image.resolvedImageApiCompatibility` is observability context. It is not enough on its own. Real ownership changes only when routing emits a distinct request schema that resolves to a distinct adapter.

- Decision: Introduce a dedicated Tuzi GPT adapter.

  Tuzi GPT compatibility should no longer be implemented as GPT-specific special cases inside `default-adapters.ts`. The generic default/basic adapter remains the fallback for broad OpenAI-compatible gateways.

- Decision: Keep the main settings UI simpler than the internal state model.

  The UI should primarily steer users toward explicit override choices for:

  - `OpenAI GPT Image`
  - `Tuzi GPT 兼容`

  Profiles that still store `auto` or `openai-compatible-basic` should remain supported, but those modes are treated as internal or migration-oriented rather than first-class marketing options.

- Decision: Default profile creation to explicit official GPT mode.

  New provider profiles should start with `imageApiCompatibility = openai-gpt-image` so the common path is explicit rather than hidden behind `auto`.

- Decision: Managed profile rebuilds must preserve stored overrides.

  Built-in managed profiles such as the legacy default and Tuzi presets may be reconstructed by settings compatibility helpers. Their rebuild path must preserve any stored `imageApiCompatibility` override instead of resetting the field to `auto`.

- Decision: Only migrate missing defaults, not explicit `auto`.

  Historical profiles that explicitly store `auto` may reflect deliberate operator intent. We should migrate missing compatibility fields and managed-profile defaults to `openai-gpt-image`, but avoid silently rewriting explicit `auto` on custom profiles.

## Internal Compatibility Model

### Stored Values

- `auto`
- `openai-gpt-image`
- `tuzi-gpt-image`
- `openai-compatible-basic`

### Accepted Legacy Alias

- `tuzi-compatible` -> normalize to `tuzi-gpt-image`

### Auto Resolution Rules

`auto` resolves only for GPT Image models. Non-GPT image models continue using their existing model-specific routing rules.

| Profile / model condition | Resolved mode |
| --- | --- |
| `api.openai.com` + GPT Image model | `openai-gpt-image` |
| `api.tu-zi.com` + GPT Image model | `tuzi-gpt-image` |
| other profile + GPT Image model | `openai-compatible-basic` |

Manual non-`auto` values always win.

## Request Schema Mapping

The routing layer should produce a schema that matches the resolved compatibility mode.

| Resolved mode | Operation | Request schema | Adapter |
| --- | --- | --- | --- |
| `openai-gpt-image` | generation | `openai.image.gpt-generation-json` | `gpt-image-adapter` |
| `openai-gpt-image` | edit | `openai.image.gpt-edit-form` | `gpt-image-adapter` |
| `tuzi-gpt-image` | generation | `tuzi.image.gpt-generation-json` | `tuzi-gpt-image-adapter` |
| `tuzi-gpt-image` | edit (phase 2) | dedicated Tuzi edit schema | `tuzi-gpt-image-adapter` |
| `openai-compatible-basic` | generation / compatibility fallback | `openai.image.basic-json` | default/basic adapter |

The key architectural change is that `tuzi-gpt-image` stops being metadata-only and becomes a real dispatch target.

## Adapter Responsibilities

### `gpt-image-adapter`

- own official GPT Image generation and edit
- own official size and quality semantics
- own official `/images/edits` multipart transport
- remain selected only by the official GPT request schemas

### `tuzi-gpt-image-adapter`

- own Tuzi GPT-specific request serialization
- translate project-level image parameters into the Tuzi GPT contract
- own the current `resolution -> legacy quality(1k|2k|4k)` folding behavior
- keep official GPT-only fields internal unless Tuzi later exposes matching support
- become the future home for Tuzi edit transport once phase 2 begins

### default/basic image adapter

- remain the generic fallback for `openai-compatible-basic`
- keep serving non-GPT OpenAI-compatible image providers
- stop owning GPT-specific Tuzi translation rules after migration

## Contract Semantics

### Official GPT Image Contract

- `quality`: official values `auto | low | medium | high`
- `size`: official GPT size value
- `resolution`: internal convenience only; it may help the UI choose a concrete size, but it is not the outbound official quality field
- edit transport: multipart/form-data for `/images/edits`

### Tuzi GPT Contract

- `size`: outbound value stays compatible with Tuzi expectations
- `resolution`: compatibility concept used to derive the legacy quality tier when needed
- outbound `quality`: legacy compatibility value such as `1k | 2k | 4k`
- official GPT `quality` remains an internal setting unless and until Tuzi explicitly supports the same meaning
- phase 2 decides the final Tuzi edit transport contract independently from official multipart semantics

### Generic OpenAI-Compatible Basic Contract

- remains a compatibility fallback
- does not become the primary home for GPT-specific translation logic

## UI Model

Primary user-facing override options:

- `OpenAI GPT Image`
- `Tuzi GPT 兼容`

Support behavior:

- new profiles default to `OpenAI GPT Image`
- built-in managed profiles default to `OpenAI GPT Image` when they have no stored override
- profiles with no explicit stored compatibility from older data are upgraded to `OpenAI GPT Image`
- profiles that already store `auto` remain on `auto`
- the settings UI can show a resolved summary for `auto`, for example “自动判断，当前解析为 OpenAI GPT Image”
- `openai-compatible-basic` remains supported for migration, diagnostics, and rollback, but does not need to be a prominent everyday choice

## Migration

- Preserve explicit stored `auto` values on custom profiles.
- Do not reinterpret existing `auto` on official OpenAI profiles as basic fallback.
- Normalize legacy `tuzi-compatible` values to `tuzi-gpt-image`.
- Keep `openai-compatible-basic` valid for existing profiles and rollback scenarios.
- Default newly created profiles to `openai-gpt-image`.
- Default managed profiles to `openai-gpt-image` when they do not already store a compatibility override.
- Upgrade profiles that are missing the compatibility field to `openai-gpt-image`.
- When copying or exporting profiles, preserve the stored compatibility mode exactly.
- Managed profile rebuild helpers must preserve explicit stored compatibility values rather than resetting them to `auto`.

## Rollout Phases

### Phase 1

- add enum and alias normalization
- add `tuzi-gpt-image` resolver branch
- add `tuzi.image.gpt-generation-json`
- add `tuzi-gpt-image-adapter`
- move Tuzi GPT generation translation logic out of `default-adapters.ts`
- keep official GPT generation/edit unchanged

### Phase 2

- define Tuzi edit request schema and transport
- route Tuzi GPT image-edit requests through `tuzi-gpt-image-adapter`
- extend planner, persistence, and tests for the dedicated Tuzi edit path

## Observability

Diagnostics should expose:

- stored `imageApiCompatibility`
- resolved compatibility mode
- `requestSchema`
- adapter ID
- submit path
- whether the request used generation or edit semantics

API keys and authorization headers must never be logged.

## Risks

- aggressive alias migration could accidentally rewrite user intent
- default migration could accidentally rewrite explicit `auto` if missing-vs-explicit state is not distinguished carefully
- `auto` could still mis-resolve for unusual custom gateways
- moving GPT translation out of the default adapter could regress current Tuzi behavior if request parity tests are weak
- UI simplification could hide recovery options unless diagnostics remain visible
- phase 2 could be delayed, leaving generation cleanly separated while Tuzi edit still relies on fallback behavior
