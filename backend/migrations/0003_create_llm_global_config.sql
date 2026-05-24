CREATE TABLE IF NOT EXISTS llm_global_configs (
  id uuid PRIMARY KEY,
  singleton_key boolean NOT NULL DEFAULT true,
  name text NOT NULL DEFAULT 'default',
  provider_type text NOT NULL DEFAULT 'openai-compatible',
  base_url text NOT NULL DEFAULT '',
  api_key text,
  api_key_last4 text,
  enabled boolean NOT NULL DEFAULT false,
  default_chat_model text NOT NULL DEFAULT 'gpt-5.5',
  default_agent_model text NOT NULL DEFAULT 'gpt-5.5',
  allowed_models jsonb NOT NULL DEFAULT '[]'::jsonb,
  timeout_seconds integer NOT NULL DEFAULT 120,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (singleton_key)
);
