CREATE TABLE IF NOT EXISTS playground_task_history (
  id uuid PRIMARY KEY,
  principal_id uuid NOT NULL REFERENCES account_principals(id) ON DELETE CASCADE,
  task_kind text NOT NULL CHECK (task_kind IN ('text', 'image')),
  status text NOT NULL CHECK (status IN ('succeeded', 'failed')),
  model text NOT NULL,
  prompt text NOT NULL,
  duration_ms bigint NOT NULL CHECK (duration_ms >= 0),
  parameters_json jsonb NOT NULL CHECK (jsonb_typeof(parameters_json) = 'object'),
  result_json jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (parameters_json ->> 'kind' = task_kind),
  CHECK (result_json IS NULL OR (jsonb_typeof(result_json) = 'object' AND result_json ->> 'kind' = task_kind)),
  CHECK (
    (status = 'succeeded' AND result_json IS NOT NULL AND error IS NULL)
    OR (status = 'failed' AND result_json IS NULL AND error IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_playground_task_history_principal_created
ON playground_task_history (principal_id, created_at DESC, id DESC);
