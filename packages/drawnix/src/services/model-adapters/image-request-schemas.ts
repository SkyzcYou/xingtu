export const OFFICIAL_GPT_IMAGE_EDIT_REQUEST_SCHEMA =
  'openai.image.gpt-edit-form';

export const TUZI_GPT_IMAGE_EDIT_REQUEST_SCHEMA =
  'tuzi.image.gpt-edit-json';

export const GPT_IMAGE_EDIT_REQUEST_SCHEMAS = [
  OFFICIAL_GPT_IMAGE_EDIT_REQUEST_SCHEMA,
  TUZI_GPT_IMAGE_EDIT_REQUEST_SCHEMA,
] as const;

export function isGPTImageEditRequestSchema(
  value?: string | readonly string[] | null
): boolean {
  const schemas = Array.isArray(value) ? value : value ? [value] : [];

  return schemas.some((schema) =>
    GPT_IMAGE_EDIT_REQUEST_SCHEMAS.includes(
      schema as (typeof GPT_IMAGE_EDIT_REQUEST_SCHEMAS)[number]
    )
  );
}
