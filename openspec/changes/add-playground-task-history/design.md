# Design: Account-synced Playground task history

## Context

`backend/web` Playground directly exercises authenticated chat and image proxy APIs. Its text and image forms currently keep results only in React state. The requested history must be Playground-specific and available on other devices signed into the same account, so browser-only storage is insufficient.

Image requests can be synchronous or use the in-progress backend image-job flow. Image edits can include local reference files, which cannot be reconstructed cross-device unless file data is separately persisted. The initial implementation intentionally avoids introducing object storage or storing large binary/base64 values in PostgreSQL.

## Goals / Non-Goals

### Goals

- Persist Playground text and image task history per authenticated account.
- Capture enough lightweight request data to inspect a task and refill the matching form.
- Record both successful and failed attempts with server timestamps and client-observed duration.
- Keep list responses bounded and newest-first.
- Preserve generated image URLs and reference file names without storing file bytes.
- Require explicit user confirmation through the existing form submit action after refill.

### Non-Goals

- No shared history with the main Drawnix task queue or prompt-history tool.
- No image/object-storage service in this change.
- No persistence of reference-image bytes, generated base64 payloads, authorization headers, API keys, or arbitrary upstream request bodies.
- No automatic resubmission from a history item.
- No history for non-Playground callers of the public proxy APIs.

## Decisions

### Explicit Playground history API

The frontend will create history records through dedicated authenticated `/api/playground/history` endpoints after each Playground mutation settles. History is not recorded inside generic `/v1/chat/completions` or `/v1/images/*` proxy handlers because those routes also serve non-Playground clients and cannot reliably distinguish their origin.

This keeps the feature scoped and avoids coupling generic proxy behavior to an admin-console concern.

### Typed lightweight record

Each record stores:

- account principal id;
- task kind (`text` or `image`);
- status (`succeeded` or `failed`);
- prompt, model, and duration;
- kind-specific parameters in a validated JSON object;
- kind-specific lightweight result in a validated JSON object;
- sanitized error text;
- server-created timestamp.

Text parameters include whether System Prompt is enabled and its text. Image parameters include size, sync/async mode, and reference file names. Text results include the generated content. Image results include only generated URLs, revised prompts, and optional backend job ids.

The backend validates discriminated request shapes rather than accepting an unchecked arbitrary blob from the browser.

### Client records settled attempts

The Playground API functions retain responsibility for calling the existing generation endpoints. The page mutation lifecycle records the settled outcome via the dedicated history API and then invalidates the history query. History-write failure is shown separately and does not replace a successful generation result or generation error.

### Replay means refill, not execute

Selecting “再次发起”:

1. switches the Playground tab to the record’s task kind;
2. refills prompt, model, and supported parameters;
3. clears old output/error state;
4. for reference-image tasks, clears selected files and shows that the original named files must be selected again;
5. scrolls/focuses the relevant form;
6. waits for the user to press the normal submit button.

This prevents accidental duplicate credit charges.

### Bounded retention surface

The first API exposes newest-first cursor/offset pagination with a conservative page limit. It does not add delete, bulk cleanup, filtering, or full-text search until concrete usage requires them.

## Risks / Trade-offs

- Generated provider URLs may expire. The UI keeps the history record and displays an unavailable-image fallback rather than storing large binary data.
- A generation may succeed while the history write fails. The generation result remains primary; the UI reports the history synchronization failure without converting the generation to a failure.
- Client-observed duration includes async polling and network time, which is useful for Playground debugging but is not a precise provider execution metric.
- Reference images cannot be replayed exactly across devices. File names are retained for context and the user must select files again.

## Migration Plan

1. Add a new account-scoped history table and indexes.
2. Add authenticated create/list routes.
3. Add frontend history client/query and settled-mutation recording.
4. Add the history list and refill actions.
5. Validate sync text, sync image, async image, failure, pagination, and cross-account isolation.

The schema is additive and can be rolled back by dropping only the new table.
