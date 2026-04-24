# Change: Add GPT Image profile compatibility routing

## Why

The same `gpt-image-*` model ID can require different image API request formats depending on the selected provider profile and API key. Some keys need the existing Tuzi/basic image compatibility path, while others need the official OpenAI GPT Image format.

Today the system mostly routes image models through model ID, protocol, and broad request schema inference. That makes it hard to support official GPT Image behavior without breaking the current default adapter compatibility path.

## What Changes

- Add a profile-level image API compatibility setting that describes the image request contract for that provider/key.
- Resolve image compatibility from `ProviderProfile + modelId`, with `auto` inference and manual override.
- Split GPT Image routing into distinct request schemas:
  - existing basic compatibility path: `openai.image.basic-json`
  - official GPT Image generation path: `openai.image.gpt-generation-json`
- Add a dedicated GPT Image adapter for official generation requests.
- Keep the current default image adapter compatibility path for Tuzi/basic and generic OpenAI-compatible image requests.
- Add settings UI for selecting the profile's image interface format.
- Add tests proving the same `gpt-image-*` model can route differently under different provider profiles.

## Non-Goals

- Do not add `TaskType.IMAGE_EDIT`.
- Do not split the MCP/tool surface into `generate_image` and `edit_image`.
- Do not introduce the full `image.generate` / `image.edit` operation abstraction in this change.
- Do not migrate all providers to a unified image edit schema.
- Do not automatically retry failed paid image requests through another compatibility mode.

## Impact

- Affected specs:
  - `provider-routing`
  - `image-generation`
- Affected code:
  - `packages/drawnix/src/utils/settings-manager.ts`
  - `packages/drawnix/src/components/settings-dialog/settings-dialog.tsx`
  - `packages/drawnix/src/services/provider-routing/types.ts`
  - `packages/drawnix/src/services/provider-routing/settings-repository.ts`
  - `packages/drawnix/src/services/provider-routing/binding-inference.ts`
  - `packages/drawnix/src/services/model-adapters/registry.ts`
  - `packages/drawnix/src/services/model-adapters/default-adapters.ts`
  - `packages/drawnix/src/services/model-adapters/gpt-image-adapter.ts`

## Relationship To Existing Changes

- Builds on `add-multi-provider-profiles`, especially the `ModelRef(profileId + modelId)` routing model.
- Narrows and extends `add-provider-protocol-routing` by adding a concrete profile-level image request contract for GPT Image compatibility.
- Preserves the existing default adapter behavior as a compatibility path rather than replacing it with model-ID-only GPT routing.
