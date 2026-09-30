# Change: Add a Cloudflare same-origin Tuzi edge proxy

## Why

The Tuzi API nodes return usable model and image responses to server clients, but their actual browser responses do not consistently include `Access-Control-Allow-Origin`. Xingtu therefore cannot reliably read model discovery, image submission, or recovery responses from the browser even when the user API key is valid.

## What Changes

- Add a Cloudflare Worker that exposes a same-origin `/__tuzi_proxy__/` route on `xingtu.live`.
- Allow only explicitly registered Tuzi upstream aliases (`api`, `apicdn`, and `apius`) and reject arbitrary upstream URLs.
- Forward authenticated model discovery, image submission, and image recovery requests without caching or logging API keys.
- Add one shared frontend URL resolver used by runtime model discovery and `provider-transport`.
- Route trusted Tuzi fallback and recovery requests through the same proxy while keeping non-Tuzi custom providers direct.
- Add deployment and smoke-test checks for the live Cloudflare route.

## Impact

- Affected specs: `provider-routing`, `runtime-model-discovery`, `image-generation`.
- Affected code: `packages/drawnix/src/services/provider-routing/*`, `packages/drawnix/src/utils/runtime-model-discovery.ts`, `packages/drawnix/src/services/image-generation-recovery-service.ts`.
- New deployment artifact: `workers/tuzi-proxy/*` and Cloudflare route configuration.
- Production behavior changes for trusted Tuzi requests only; arbitrary custom providers remain direct.
