# Change: Add request-body async Xingtu account image generation

## Why

The Xingtu account image-generation path can exceed browser, reverse-proxy, backend, or LLM Gateway timeouts while waiting for the upstream provider. The public API should match common image gateway conventions: submit to the normal image-generation endpoint and opt into async with `async: true`, then poll a generation task URL.

## What Changes

- **BREAKING** Replace special async routes with request-body async mode:
  - submit async jobs with `POST /v1/images/generations` and JSON `async: true`
  - query jobs with `GET /v1/images/generations/{task_id}`
  - remove `/v1/images/generations/async`, `/v1/images/edits/async`, `/v1/images/jobs/{id}`, and `/v1/images/jobs/{id}/cancel`
- Keep our backend `image_jobs` table and worker as the business source of truth; public task ids are our internal job ids.
- Strip the local-only `async` field before storing the request body and before forwarding to LLM Gateway.
- Keep Backend API -> LLM Gateway execution synchronous in the worker for this change; do not add `provider_task_id` yet.
- Keep `POST /v1/images/generations` synchronous when `async: true` is absent.
- Support multipart image edits through `POST /v1/images/edits` with form field `async=true`, while stripping that local-only field before LLM Gateway forwarding.
- Preserve Xingtu API Key (`legacy-default`) and custom provider calls on the existing providerTransport/adapter path.

## Non-Goals

- Do not introduce provider-side async polling or `provider_task_id`.
- Do not add provider-side async polling for multipart edits in this change.
- Do not change custom provider, Xingtu API Key, chat, text, model-list, audio, or video behavior.
- Do not introduce object storage for generated media in this pass.

## Impact

- Affected specs:
  - `image-generation`
  - `provider-routing`
- Affected code:
  - `backend/src/routes/llm_proxy.rs`
  - `backend/src/routes/image_jobs.rs`
  - `backend/src/image_jobs.rs`
  - `backend/src/image_job_worker.rs`
  - `backend/web/src/features/playground/playground.api.ts`
  - `backend/web/src/features/playground/PlaygroundPage.tsx`
  - `packages/drawnix/src/services/async-image-api-service.ts`
  - `packages/drawnix/src/services/model-adapters/gpt-image-adapter.ts`

## Relationship To Existing Changes

- Supersedes the previous `/async` endpoint shape in this change.
- Coexists with `update-image-api-compatibility-modes`; this change does not redefine generic provider compatibility modes.
- Uses the resolved provider route as the frontend boundary and the request-body `async: true` flag as the public Backend API boundary.
