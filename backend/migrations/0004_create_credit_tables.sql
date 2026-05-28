CREATE TABLE IF NOT EXISTS account_credit_balances (
  principal_id uuid PRIMARY KEY REFERENCES account_principals(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_credit_prices (
  model_id text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('chat', 'image_generation', 'image_edit', 'agent')),
  credits_per_request bigint NOT NULL CHECK (credits_per_request >= 0),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (model_id, request_type)
);

CREATE TABLE IF NOT EXISTS account_credit_ledger (
  id uuid PRIMARY KEY,
  principal_id uuid NOT NULL REFERENCES account_principals(id) ON DELETE CASCADE,
  delta bigint NOT NULL,
  balance_after bigint NOT NULL CHECK (balance_after >= 0),
  reason text NOT NULL CHECK (reason IN ('model_request', 'refund', 'admin_adjustment')),
  model_id text,
  request_type text CHECK (request_type IS NULL OR request_type IN ('chat', 'image_generation', 'image_edit', 'agent')),
  request_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_credit_ledger_principal
ON account_credit_ledger (principal_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_credit_ledger_request_reason
ON account_credit_ledger (request_id, reason)
WHERE request_id IS NOT NULL;
