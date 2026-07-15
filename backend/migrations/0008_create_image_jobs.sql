CREATE TABLE IF NOT EXISTS image_jobs (
  id uuid PRIMARY KEY,
  principal_id uuid NOT NULL REFERENCES account_principals(id) ON DELETE CASCADE,
  credit_request_id text NOT NULL UNIQUE,
  model_id text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('image_generation', 'image_edit')),
  upstream_path text NOT NULL CHECK (upstream_path IN ('images/generations', 'images/edits')),
  content_type text,
  request_body bytea NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'cancelled')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  result_json jsonb,
  error_json jsonb,
  credit_refunded_at timestamptz,
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_image_jobs_principal_created
ON image_jobs (principal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_jobs_status_created
ON image_jobs (status, created_at);

CREATE INDEX IF NOT EXISTS idx_image_jobs_running_locked
ON image_jobs (locked_at)
WHERE status = 'running';
