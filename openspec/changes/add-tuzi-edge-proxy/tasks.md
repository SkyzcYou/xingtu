## 1. Cloudflare Worker

- [x] 1.1 Add an allowlisted Tuzi reverse-proxy Worker with exact path aliasing.
- [x] 1.2 Preserve Authorization, Content-Type, X-Request-Id, request bodies, status codes, and response streams.
- [x] 1.3 Disable cache and redact sensitive headers from logs/observability.
- [x] 1.4 Add the `xingtu.live/__tuzi_proxy__/*` route through cf CLI.

## 2. Frontend routing

- [x] 2.1 Add a shared browser-only Tuzi proxy URL resolver.
- [x] 2.2 Apply it in `provider-transport` after credential inheritance decisions.
- [x] 2.3 Reuse it for runtime model discovery, fallback nodes, and image recovery polling.
- [x] 2.4 Keep non-Tuzi custom providers direct.

## 3. Verification

- [x] 3.1 Add unit tests for alias mapping, path normalization, query preservation, and open-proxy rejection.
- [x] 3.2 Add transport/discovery/recovery tests proving trusted Tuzi requests use the proxy URL.
- [x] 3.3 Run typecheck, focused tests, and `git diff --check`.
- [x] 3.4 Smoke-test the deployed route with `/v1/models`, an intentionally invalid image request, and a recovery-shaped GET without spending credits.
- [x] 3.5 Verify the homepage and non-Tuzi provider requests remain unaffected.
