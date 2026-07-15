# Design: Request-body async Xingtu account image generation

## Context

The current Xingtu account model-call chain is:

```text
Xingtu frontend -> Xingtu Backend API -> LLM-Gateway -> LLM provider
```

For image generation, a synchronous frontend request can remain open across browser, Backend API, LLM Gateway, and provider execution. That request can be interrupted by infrastructure timeouts even when the provider eventually succeeds.

We will keep the backend job model but expose it through the normal image generation endpoint with `async: true`, matching common gateway conventions.

## Goals / Non-Goals

### Goals

- Make Xingtu account image generation resilient to long upstream execution times.
- Keep frontend-to-backend requests short by returning a job id immediately after validation and charge.
- Use `POST /v1/images/generations` with JSON `async: true` as the public async submit API.
- Use `GET /v1/images/generations/{task_id}` as the public job query API.
- Strip `async` before storing and forwarding the upstream request.
- Execute Backend API -> LLM-Gateway calls synchronously in a backend worker.
- Persist job state and result for polling and refresh recovery.
- Keep Credits idempotent: charge once, refund once on failed jobs.

### Non-Goals

- No provider-side async polling or `provider_task_id` in this change.
- Multipart image edits use `POST /v1/images/edits` with form field `async=true`; the backend strips that field before storing/forwarding.
- No behavior change for `legacy-default` Xingtu API Key calls.
- No behavior change for custom provider profiles.
- No async text/chat/model-list support in this change.
- No new media object-storage layer in the initial implementation.

## Routing Boundary

Frontend async routing is enabled only when all of the following are true:

```text
operation is image generation
route.profileId === XINGTU_LOGIN_PROVIDER_PROFILE_ID
route.credentialSource === 'oidc-session'
```

The frontend must not use base URL, model ID, or provider name heuristics to enter the async path.

All other routes continue through the existing providerTransport/model-adapter path.

## Backend API Shape

The public async API uses the existing generation submit route:

```http
POST /v1/images/generations
GET  /v1/images/generations/{task_id}
```

Submit behavior:

- If the JSON body has top-level boolean `async: true`, the backend:
  1. authenticates the Bearer token;
  2. loads global LLM config;
  3. removes `async` from the JSON request body;
  4. validates `model` against allowed models;
  5. charges Credits using a job-scoped request id;
  6. persists a generation job row with status `pending` and the sanitized body;
  7. returns `202 Accepted` with our job id.
- If `async` is absent or not `true`, `POST /v1/images/generations` keeps the existing synchronous OpenAI-compatible proxy behavior.

The query endpoint returns image generation and image edit jobs owned by the authenticated account. It does not expose jobs owned by another principal or any stored request body.

Remove the old public routes:

```http
POST /v1/images/generations/async
POST /v1/images/edits/async
GET  /v1/images/jobs/{id}
POST /v1/images/jobs/{id}/cancel
```

`POST /v1/images/edits` supports multipart async when form field `async=true` is present. The backend removes that local-only part before storing and forwarding the multipart body to LLM Gateway.

## Job State Model

Use the existing minimal state machine:

```text
pending -> running -> succeeded
pending -> running -> failed
pending -> cancelled
running -> cancelled (internal/best effort only)
running -> failed (timeout or execution error)
```

Stored fields include:

- `id`
- `principal_id`
- `request_type` (`image_generation` / `image_edit`)
- `model_id`
- `credit_request_id`
- `status`
- safe content-type metadata
- sanitized `request_body`
- `result_json`
- `error_json`
- `credit_refunded_at`
- `created_at`, `updated_at`, `started_at`, `completed_at`
- `attempt_count`

Do not store Authorization headers or API keys. Do not store the local-only `async` flag in `request_body`.

## Worker Execution

A backend worker polls pending jobs, claims one atomically, marks it `running`, then sends the stored sanitized request body to LLM Gateway synchronously:

```text
sanitized job request body -> Backend HTTP client -> LLM-Gateway -> upstream response JSON/body
```

On success:

- persist the upstream status, safe headers, and JSON/body result;
- mark job `succeeded`.

On failure:

- persist a sanitized error;
- mark job `failed`;
- refund Credits exactly once.

## Credits Semantics

The charge happens when a job is accepted, before returning `202`. This matches the current synchronous behavior where Credits are charged before sending the upstream request.

Refund happens when:

- upstream send fails;
- upstream returns a non-success status;
- worker marks the job failed due to timeout or execution error.

Refund must be idempotent and keyed by the job-scoped request id so worker restarts do not double-refund.

## Frontend Integration

The Xingtu account image path submits jobs by calling:

```text
POST /v1/images/generations  { ..., async: true }
POST /v1/images/edits        multipart field async=true
```

Then it polls:

```text
GET /v1/images/generations/{job_id}
```

The caller should still receive the existing image result shape (`url`, `urls`, `format` when available) so task completion, cache, media preview, and canvas insertion flows remain reused.

Store the backend job id in existing task metadata or `remoteId` so task recovery can resume polling after refresh.

Reference-image/edit requests enter backend async by adding multipart field `async=true`; the backend strips that field before worker forwarding.

## Compatibility Guarantees

- Xingtu API Key (`legacy-default`) still sends direct API requests with the user-provided API Key.
- Custom provider profiles still use providerTransport and model adapters.
- Existing `POST /v1/images/generations` remains synchronous unless `async: true` is present.
- Existing `POST /v1/images/edits` remains synchronous unless multipart field `async=true` is present.
- Text/chat/model-list calls do not enter the async image job path.

## Risks and Mitigations

- `async` leaks upstream: parse and remove it before job insertion; add sanitizer tests.
- Worker crash after charge: persist jobs and let another worker claim stale `pending`/`running` jobs or fail them with refund after timeout.
- Double refund: use existing ledger/request id uniqueness and store `credit_refunded_at` on the job.
- Result JSON incompatibility: adapt backend job result back into the existing frontend image result shape at the executor boundary.
- Multipart complexity: strip only the explicit `async=true` part and preserve all other file/field parts byte-for-byte.
