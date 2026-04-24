## Context

The first GPT Image compatibility phase added profile-level image API compatibility and a dedicated official generation schema:

- `openai.image.gpt-generation-json` -> `/images/generations`
- `openai.image.basic-json` -> existing default compatibility adapter

The second phase needs `/images/edits`, but the project still has only one image task surface and one image adapter method. A broad image operation abstraction would be cleaner long-term, but too large for this step.

## Goals / Non-Goals

- Goals:
  - Support official GPT Image image-to-image/edit requests.
  - Reuse existing `TaskType.IMAGE` queue/history/canvas flows.
  - Keep basic Tuzi/OpenAI-compatible behavior unchanged.
  - Avoid routing by model ID alone.
- Non-Goals:
  - No new task type.
  - No new public MCP tool name.
  - No full mask drawing UI in this phase.

## Decisions

- Decision: Add an edit request schema instead of a new task type.

  The schema is the existing adapter handoff point. It lets the routing layer choose official generation vs official edit while keeping task plumbing stable.

- Decision: Add planner-level schema preference.

  The same model/profile can have both generation and edit bindings. Runtime request shape, not model ID, decides which binding is appropriate.

- Decision: Use multipart edit requests for the official GPT Image adapter.

  The official `/images/edits` examples use file-style form fields such as `image[]=@...`. The adapter converts the existing canvas data URLs or fetchable image references to `Blob`s, appends them as `image[]`, and lets `fetch` set the multipart boundary.

## Runtime Flow

```text
Image task
  -> extract reference images
  -> decide preferred schema:
       no references -> openai.image.gpt-generation-json
       references/mask/edit mode -> openai.image.gpt-edit-form
  -> resolve invocation plan with preferred schema
  -> resolve adapter from binding
  -> gpt-image-adapter sends /images/generations or /images/edits
```

If the preferred edit schema is unavailable, planning falls back to the highest-priority image binding. That preserves Tuzi/basic compatibility.

## Request Fields

Extend `ImageGenerationRequest` with lightweight edit semantics:

```ts
type ImageGenerationMode = 'text_to_image' | 'image_to_image' | 'image_edit';

interface ImageGenerationRequest {
  generationMode?: ImageGenerationMode;
  referenceImages?: string[];
  maskImage?: string;
  inputFidelity?: 'high' | 'low';
}
```

Official edit multipart fields:

```text
model=gpt-image-1.5
prompt=...
image[]=@image-1.png
mask=@mask.png
input_fidelity=high
size=1024x1024
```

## Rollback

Switching a profile from `openai-gpt-image` to `tuzi-compatible` or `openai-compatible-basic` returns reference-image requests to the default adapter compatibility path.
