# Change: Add Prompt History Tool

## Why
Users need a local way to manage prompts across generated tasks, including the original prompt, the prompt sent to generation, and a quick result preview.

## What Changes
- Add a built-in toolbox tool named "提示词历史".
- Derive prompt history from existing task records instead of creating a separate history entity.
- Store lightweight prompt lineage metadata on newly created generation tasks.
- Extend reusable prompt list items to show title, sent prompt, tags, and result preview on hover.

## Impact
- Affected specs: `toolbox`, `prompt-history`
- Affected code: toolbox built-in registry, task summary reader, prompt history aggregation service, prompt list UI, AI input workflow task metadata.
