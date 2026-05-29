CREATE TABLE IF NOT EXISTS credit_global_configs (
  id uuid PRIMARY KEY,
  singleton_key boolean NOT NULL DEFAULT true,
  new_user_bonus_credits bigint NOT NULL DEFAULT 0 CHECK (new_user_bonus_credits >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (singleton_key)
);

ALTER TABLE account_principals
  ADD COLUMN IF NOT EXISTS new_user_bonus_processed_at timestamptz;

UPDATE account_principals
SET new_user_bonus_processed_at = COALESCE(last_login_at, updated_at, now())
WHERE new_user_bonus_processed_at IS NULL;

ALTER TABLE account_credit_ledger
DROP CONSTRAINT IF EXISTS account_credit_ledger_reason_check;

ALTER TABLE account_credit_ledger
ADD CONSTRAINT account_credit_ledger_reason_check
CHECK (reason IN ('model_request', 'refund', 'admin_adjustment', 'payment_recharge', 'new_user_bonus'));
