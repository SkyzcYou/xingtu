## 1. OpenSpec and API contract

- [x] 1.1 Revise the change proposal/design from special `/async` routes to request-body `async: true`.
- [ ] 1.2 Update image-generation/provider-routing spec deltas for the new public API shape.
- [ ] 1.3 Validate the OpenSpec change with `openspec validate add-async-xingtu-account-image-generation --strict`.

## 2. Backend request-body async routing

- [ ] 2.1 Dispatch `POST /v1/images/generations` to async job creation only when JSON `async: true` is present.
- [ ] 2.2 Strip `async` from the JSON body before storing the job request body.
- [ ] 2.3 Preserve synchronous `POST /v1/images/generations` behavior when `async: true` is absent.
- [ ] 2.4 Support `POST /v1/images/edits` async mode when multipart field `async=true` is present, and strip only that local-only field before storing/forwarding.
- [ ] 2.5 Add `GET /v1/images/generations/:id` for authenticated image-job status/result lookup.
- [ ] 2.6 Remove public `/v1/images/generations/async`, `/v1/images/edits/async`, `/v1/images/jobs/:id`, and `/v1/images/jobs/:id/cancel` routes.
- [ ] 2.7 Ensure query lookup cannot expose jobs owned by another principal or non-image job data through the image polling endpoint.

## 3. Backend worker and credits behavior

- [ ] 3.1 Keep worker execution synchronous toward LLM Gateway using the sanitized stored body.
- [ ] 3.2 Keep charge-on-accepted-job and refund-on-failed-execution behavior idempotent.
- [ ] 3.3 Add or update backend tests for async flag stripping, sync fallback, generation query ownership/type guard, and removed old routes.

## 4. Frontend scoped async path

- [ ] 4.1 Update backend playground to submit async generation with `/v1/images/generations` + `async: true` and poll `/v1/images/generations/{jobId}`.
- [ ] 4.2 Update playground copy to remove `/async` and `/jobs` references.
- [ ] 4.3 Update Drawnix Xingtu account async generation client to use the request-body async API.
- [ ] 4.4 Remove first-party calls to `/v1/images/edits/async`; submit async edit/reference-image requests to `/v1/images/edits` with multipart field `async=true`.
- [ ] 4.5 Preserve Xingtu API Key (`legacy-default`) and custom providers on the existing providerTransport/adapter path.
- [ ] 4.6 Keep storing backend job id in existing task metadata or `remoteId` for refresh recovery.

## 5. Validation

- [ ] 5.1 Run backend tests for affected routes/credits/job logic.
- [ ] 5.2 Run frontend type/lint validation (`pnpm check`, or focused equivalent if existing unrelated lint blockers remain).
- [ ] 5.3 Search the codebase to confirm old `/async` and `/v1/images/jobs` client calls are removed.
- [ ] 5.4 Manually verify Xingtu account text-to-image async generation completes through `async: true` polling without changing API Key generation behavior.
