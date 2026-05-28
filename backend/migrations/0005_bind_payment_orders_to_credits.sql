ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES account_principals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credit_package_id text,
  ADD COLUMN IF NOT EXISTS credit_amount bigint CHECK (credit_amount IS NULL OR credit_amount > 0),
  ADD COLUMN IF NOT EXISTS credit_ledger_id uuid REFERENCES account_credit_ledger(id),
  ADD COLUMN IF NOT EXISTS credited_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_payment_orders_principal_created_at
ON payment_orders (principal_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_credit_ledger_id
ON payment_orders (credit_ledger_id)
WHERE credit_ledger_id IS NOT NULL;

ALTER TABLE account_credit_ledger
DROP CONSTRAINT IF EXISTS account_credit_ledger_reason_check;

ALTER TABLE account_credit_ledger
ADD CONSTRAINT account_credit_ledger_reason_check
CHECK (reason IN ('model_request', 'refund', 'admin_adjustment', 'payment_recharge'));
