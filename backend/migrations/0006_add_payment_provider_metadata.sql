ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'qingke',
  ADD COLUMN IF NOT EXISTS provider_trade_no text;

ALTER TABLE payment_orders
  DROP CONSTRAINT IF EXISTS payment_orders_payment_provider_check;

ALTER TABLE payment_orders
  ADD CONSTRAINT payment_orders_payment_provider_check
  CHECK (payment_provider IN ('qingke', 'noipay'));

CREATE INDEX IF NOT EXISTS idx_payment_orders_provider_trade_no
ON payment_orders (payment_provider, provider_trade_no)
WHERE provider_trade_no IS NOT NULL;
