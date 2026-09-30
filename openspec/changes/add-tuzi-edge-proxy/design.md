## Context

`xingtu.live` is served through a proxied Cloudflare zone. The repository contains development, Vercel, Netlify, and Nginx session-proxy declarations, but the live `/__opentu_tuzi_session__/` path currently returns 404. The existing browser code only rewrites `api.tu-zi.com` for model discovery, while `provider-transport` and recovery paths can still target Tuzi origins directly.

## Goals / Non-Goals

- Goals: remove browser CORS dependency for trusted Tuzi model discovery, image POSTs, and image recovery; preserve provider-specific paths, methods, bodies, credentials, and response status; prevent the Worker from becoming an open proxy.
- Non-goals: proxy arbitrary custom providers, store user API keys, change Tuzi upstream behavior, or replace the Xingtu account/credit backend.

## Decisions

- Use a Cloudflare Worker route on `xingtu.live/__tuzi_proxy__/*`.
- Encode the upstream choice as a fixed path alias (`api`, `apicdn`, or `apius`) instead of accepting a target URL or host query parameter.
- Keep API keys in the browser request's `Authorization` header only; the Worker forwards the header and never persists it.
- Apply the proxy mapping at the final network URL in the shared transport, after credential and request-signing decisions use the original provider URL.
- Reuse the same mapping for runtime `/models`, ordinary provider requests, fallback nodes, and recovery polling.
- Disable cache for authenticated requests and preserve streaming/request bodies.
- Add exact-origin handling for `https://xingtu.live` and `https://www.xingtu.live`; same-origin requests do not depend on upstream CORS headers.

## Risks / Trade-offs

- The Worker can observe user API keys in transit; request logs and analytics must redact Authorization and responses must never be cached.
- A long-running synchronous upstream request may be constrained by the Cloudflare plan; asynchronous Tuzi paths remain preferred where available.
- A misconfigured route could shadow the SPA; deploy the Worker only on the dedicated `/__tuzi_proxy__/*` pattern and smoke-test the homepage.
- Existing tasks or tests that assert direct Tuzi URLs need explicit proxy-aware expectations.

## Migration Plan

1. Deploy the Worker to a staging or non-production route and test GET, POST, and recovery-shaped GET requests with a disposable key.
2. Add the shared frontend proxy resolver and focused unit tests.
3. Publish the frontend build with proxy routing enabled for trusted Tuzi hosts.
4. Attach the production route and verify browser Network URLs, model discovery, image submission, and recovery polling.
5. Roll back by removing the route and disabling the frontend resolver; direct custom-provider behavior remains unchanged.

## Open Questions

- Confirm whether the current Cloudflare plan and upstream response durations support the existing 15-minute synchronous image timeout.
- Confirm whether `www.xingtu.live` should share the route or redirect before reaching the Worker.
