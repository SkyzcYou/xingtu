## 1. Implementation
- [x] 1.1 Record the user-approved first-stage design and migration boundary.
- [x] 1.2 Add shared update safety, admission, persistence and policy primitives.
- [x] 1.3 Add all-client worker preparation and activation coordination.
- [x] 1.4 Add background checks, inactivity/countdown policy and update UI.
- [x] 1.5 Integrate board/draft persistence and active-operation guards.
- [x] 1.6 Verify critical startup assets and retain old-client caches.

## 2. Validation
- [x] 2.1 Test idle/countdown/deadline policy, veto/timeout/race cases and reload idempotency.
- [x] 2.2 Test failed save, draft restore, operation admission and task drain behavior.
- [x] 2.3 Run type checks, focused tests and production build validation.
- [x] 2.4 Document verified behavior and the one-time legacy migration boundary.
