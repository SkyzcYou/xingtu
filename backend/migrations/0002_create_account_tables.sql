CREATE TABLE IF NOT EXISTS account_principals (
  id uuid PRIMARY KEY,
  trust_issuer text NOT NULL,
  trust_subject text NOT NULL,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  UNIQUE (trust_issuer, trust_subject)
);

CREATE INDEX IF NOT EXISTS idx_account_principals_subject
ON account_principals (trust_subject);

CREATE TABLE IF NOT EXISTS account_api_profiles (
  id uuid PRIMARY KEY,
  principal_id uuid NOT NULL REFERENCES account_principals(id) ON DELETE CASCADE,
  profile_id text NOT NULL DEFAULT 'legacy-default',
  profile_name text NOT NULL DEFAULT '星图ai-通用渠道',
  provider_type text NOT NULL DEFAULT 'openai-compatible',
  base_url text NOT NULL,
  auth_type text NOT NULL DEFAULT 'bearer',
  api_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  UNIQUE (principal_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_account_api_profiles_principal
ON account_api_profiles (principal_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_api_profiles_one_default
ON account_api_profiles (principal_id)
WHERE is_default = true;
