# Change: Update PPT Outline Generation Flow

## Why
The current `generate_ppt` flow immediately submits image tasks for every slide after creating frames. This makes prompts hard to review before generation and can burst many image tasks at once.

## What Changes
- Add an outline mode inside the PPT editor, alongside the existing slide thumbnail mode.
- Change `generate_ppt` to create PPT frames with shared style and per-slide prompts only, without starting image tasks.
- Add controlled slide image generation from outline mode with serial and parallel modes.
- Open the project drawer on the PPT editor tab and switch to outline mode after PPT outline generation.

## Impact
- Affected specs: ppt-outline-generation
- Affected code: PPT MCP tool, PPT editor panel, project drawer open/tab bridge, workflow main-thread tool routing
