# Change: Add GPT Image edit support

## Why

Official GPT Image editing uses `/images/edits` with a different request contract from text-to-image generation. The first GPT Image compatibility phase intentionally shipped only `/images/generations`; users now need image-to-image/edit support without replacing the existing Tuzi/basic compatibility fallback.

## What Changes

- Add an official GPT Image edit request schema for `/images/edits`.
- Let image invocation planning prefer a request schema when the current request requires edit semantics.
- Extend the image adapter request shape with lightweight edit fields while keeping `TaskType.IMAGE`.
- Extend the GPT Image adapter to build official multipart edit requests from reference images.
- Keep Tuzi/basic GPT Image compatibility on the existing default adapter path.
- Add tests for generation-vs-edit routing, request bodies, and adapter selection.

## Non-Goals

- Do not add `TaskType.IMAGE_EDIT`.
- Do not add a public `edit_image` MCP tool in this change.
- Do not build full mask drawing UI in this change.
- Do not convert all image providers to a common `image.generate` / `image.edit` abstraction.

## Impact

- Affected specs:
  - `provider-routing`
  - `image-generation`
- Affected code:
  - `packages/drawnix/src/services/provider-routing/types.ts`
  - `packages/drawnix/src/services/provider-routing/invocation-planner.ts`
  - `packages/drawnix/src/services/provider-routing/settings-repository.ts`
  - `packages/drawnix/src/services/provider-routing/binding-inference.ts`
  - `packages/drawnix/src/services/provider-routing/endpoint-binding-inference.ts`
  - `packages/drawnix/src/services/model-adapters/types.ts`
  - `packages/drawnix/src/services/model-adapters/context.ts`
  - `packages/drawnix/src/services/model-adapters/gpt-image-adapter.ts`
  - `packages/drawnix/src/services/generation-api-service.ts`
