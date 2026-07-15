# Change: Add account-synced Playground task history

## Why

The backend admin Playground currently loses text and image generation context after navigation or when an administrator uses another device. Administrators need a Playground-only audit and replay aid that preserves basic request/result information and can restore the original form for confirmation before sending a new request.

## What Changes

- Add authenticated, account-scoped Playground history persisted by the backend database and available across devices.
- Record successful and failed Playground text and image submissions with prompt, model, basic generation parameters, status, result summary, error, duration, and timestamps.
- Store generated image result URLs only; do not persist image binaries or base64 data.
- List Playground history in reverse chronological order with bounded pagination.
- Add a “再次发起” action that switches to the matching text/image form and refills the replayable parameters without automatically submitting.
- For image-edit history, retain reference-image file names as context but require the user to select the files again before submitting.
- Keep this history exclusive to `backend/web` Playground calls; normal public proxy requests and Drawnix generation tasks are not included.

## Impact

- Affected specs:
  - `playground-task-history` (new capability)
- Affected code:
  - `backend/migrations/`
  - `backend/src/routes/`
  - `backend/web/src/features/playground/playground.api.ts`
  - `backend/web/src/features/playground/PlaygroundPage.tsx`
  - Playground styles and targeted tests

## Relationship To Existing Changes

- Coexists with `add-async-xingtu-account-image-generation`; history records the Playground’s selected sync/async image mode and the final result after any job polling completes.
- Does not modify the existing Drawnix `prompt-history` capability, which derives history from the main application task queue rather than backend Playground records.
