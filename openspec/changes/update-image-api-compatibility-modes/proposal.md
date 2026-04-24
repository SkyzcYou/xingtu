# Change: Update image API compatibility modes for official and Tuzi GPT Image routing

## Why

The project already supports official GPT Image generation and edit requests through a dedicated adapter, but Tuzi GPT compatibility is still implemented as a hidden branch inside the generic default image adapter. That keeps current behavior working, but it leaves three important problems:

- `Tuzi GPT compatibility` does not have a real adapter boundary of its own.
- `auto` still feels ambiguous because it resolves to different contracts without a clear ownership model.
- future `/images/edits` work for Tuzi or other GPT-compatible gateways will keep accumulating inside the generic basic adapter.

We need to separate these contracts cleanly before more image capabilities are added.

## What Changes

- Refine internal image compatibility modes to four values:
  - `auto`
  - `openai-gpt-image`
  - `tuzi-gpt-image`
  - `openai-compatible-basic`
- Keep `auto` as a runtime resolver, not as a concrete wire contract.
- Accept legacy `tuzi-compatible` values as an alias and normalize them toward `tuzi-gpt-image`.
- Add a dedicated `tuzi-gpt-image-adapter` so Tuzi GPT compatibility no longer lives inside the generic default/basic adapter.
- Add a dedicated Tuzi GPT request schema for text-to-image generation, with edit support designed as the next phase.
- Keep official GPT generation and edit on the existing dedicated `gpt-image-adapter`.
- Keep `openai-compatible-basic` as the generic fallback path for non-official gateways and emergency rollback.
- Default newly created provider profiles to `openai-gpt-image` instead of `auto`.
- Default built-in managed provider profiles to `openai-gpt-image` when they do not already have a stored override.
- Preserve explicit stored `auto` on historical custom profiles instead of silently rewriting user intent.
- Migrate only missing compatibility fields or managed-profile defaults toward `openai-gpt-image`, while keeping manual overrides round-trippable.
- Simplify the profile settings UX so the main choices emphasize:
  - `OpenAI GPT Image`
  - `Tuzi GPT 兼容`
  while `auto` and `openai-compatible-basic` remain internal or migration-oriented modes.
- Make size, resolution, and quality contract semantics explicit for official GPT versus Tuzi/basic compatibility.

## Non-Goals

- Do not introduce the broader `image.generate` / `image.edit` operation abstraction in this change.
- Do not add a new public MCP tool name or a new image task type.
- Do not remove the generic `openai-compatible-basic` fallback.
- Do not redefine `auto` as always-official or always-basic.
- Do not fully standardize Tuzi edit transport in the first implementation phase.

## Impact

- Affected specs:
  - `provider-profiles`
  - `provider-routing`
  - `image-generation`
- Affected code:
  - `packages/drawnix/src/utils/settings-manager.ts`
  - `packages/drawnix/src/components/settings-dialog/settings-dialog.tsx`
  - `packages/drawnix/src/services/provider-routing/types.ts`
  - `packages/drawnix/src/services/provider-routing/settings-repository.ts`
  - `packages/drawnix/src/services/provider-routing/binding-inference.ts`
  - `packages/drawnix/src/services/provider-routing/endpoint-binding-inference.ts`
  - `packages/drawnix/src/services/model-adapters/default-adapters.ts`
  - `packages/drawnix/src/services/model-adapters/gpt-image-adapter.ts`
  - `packages/drawnix/src/services/model-adapters/registry.ts`
  - `packages/drawnix/src/services/model-adapters/image-size-quality-resolver.ts`
  - `packages/drawnix/src/services/model-adapters/tuzi-gpt-image-adapter.ts`
  - `packages/drawnix/src/services/generation-api-service.ts`
  - `packages/drawnix/src/mcp/tools/image-generation.ts`

## Relationship To Existing Changes

- Builds on `add-gpt-image-profile-compatibility`, but tightens the contract boundary so Tuzi GPT compatibility is no longer treated as a generic basic-only branch.
- Builds on `add-gpt-image-edit-support`, while keeping official `/images/edits` on the existing adapter and reserving a cleaner Tuzi edit contract for the next phase.
- Preserves the current default/basic adapter as a fallback path rather than the long-term home for GPT-specific compatibility logic.
- Revises the earlier rollout assumption that new or rebuilt profiles should keep defaulting to `auto`; this follow-up makes explicit GPT mode the default while retaining `auto` as an advanced resolver.
