# Change: Refactor Prompt Optimization Public Capability

## Why
Prompt optimization is now embedded in several UI entrypoints with shared behavior but coarse scene prompts. Each scene needs a different optimization direction, and users should be able to tune those directions without changing code.

## What Changes
- Extract prompt optimization scenario registry, prompt building, and result normalization into a shared service.
- Add a shared prompt optimization button component for common icon, tooltip, dialog, and fill-back behavior.
- Store scenario-specific optimization templates as editable Knowledge Base notes under a "提示词优化" directory.
- Keep built-in templates as fallback and automatically restore missing or empty template notes.

## Impact
- Affected specs: prompt-optimization
- Affected code: shared prompt optimization dialog/button, AI input bar, image/video prompt input, PPT outline prompts, music analyzer create page, Knowledge Base note access.
