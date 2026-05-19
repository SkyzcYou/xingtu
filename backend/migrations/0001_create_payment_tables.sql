CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY,
  out_trade_no text NOT NULL UNIQUE,
  qingke_trade_no text,
  api_trade_no text,
  name text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  pay_channel text NOT NULL CHECK (pay_channel IN ('alipay', 'wxpay')),
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'refunded', 'frozen', 'failed')),
  param text,
  buyer text,
  notify_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders(created_at DESC);

CREATE TABLE IF NOT EXISTS payment_notify_events (
  id uuid PRIMARY KEY,
  out_trade_no text,
  trade_no text,
  payload jsonb NOT NULL,
  signature_valid boolean NOT NULL,
  processed boolean NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_notify_events_out_trade_no ON payment_notify_events(out_trade_no);
CREATE INDEX IF NOT EXISTS idx_payment_notify_events_created_at ON payment_notify_events(created_at DESC);
