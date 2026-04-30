## Context
Prompt optimization is used by AI input, generation tools, PPT outline prompts, and music creation. The current prompt builder lives in the image/video generation utility and only understands broad model types.

## Decisions
- Use scenario IDs as the public routing key. Scenario IDs keep optimization intent separate from storage history buckets.
- Use Knowledge Base notes as the user-editable template store. Notes are matched by `metadata.sourceUrl = aitu://prompt-optimization/<scenarioId>`.
- Always append a system-controlled input block containing original prompt and requirements so a user-edited template cannot drop required runtime data.
- Restore missing or empty template notes from built-in defaults, but never overwrite non-empty user-edited notes.

## Risks
- Knowledge Base access is asynchronous, so prompt construction is async and must stay inside the existing optimize request flow.
- PPT prompt history and optimization type are intentionally separate. Public PPT prompts use `ppt-common`; slide prompts keep image history behavior.
- Large prompt templates must remain in note content, not note metadata, to avoid bloating list reads.
