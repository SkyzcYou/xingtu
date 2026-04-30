# Change: refactor workflow shell

## Why

Video analyzer, MV creator, and music analyzer duplicate the same workflow container concerns: step navigation, history/starred state, record loading, and completed task synchronization. This makes small fixes expensive and increases the chance of lifecycle leaks or divergent behavior.

## What Changes

- Add shared internal workflow shell primitives for step bars, record state, and task synchronization
- Migrate the three workflow containers to those shared primitives without changing user-facing behavior
- Preserve existing storage keys, record schemas, task metadata, provider routing, media handling, and service worker behavior
- Add focused unit tests for the shared primitives and container-critical edge cases

## Impact

- Affected specs: `workflow-shell`
- Affected code:
  - `packages/drawnix/src/components/shared/workflow/`
  - `packages/drawnix/src/components/video-analyzer/`
  - `packages/drawnix/src/components/mv-creator/`
  - `packages/drawnix/src/components/music-analyzer/`
