CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('update', 'notice', 'activity', 'maintenance')),
  priority smallint NOT NULL DEFAULT 0,
  audience text NOT NULL CHECK (audience IN ('public', 'authenticated', 'accounts')),
  status text NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  link_url text,
  link_label text,
  publish_at timestamptz,
  expire_at timestamptz,
  version bigint NOT NULL DEFAULT 1,
  created_by_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_status_publish
ON messages (status, publish_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_audience_status_publish
ON messages (audience, status, publish_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_updated_at
ON messages (updated_at DESC);

CREATE TABLE IF NOT EXISTS message_targets (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES account_principals(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, principal_id)
);

CREATE INDEX IF NOT EXISTS idx_message_targets_principal
ON message_targets (principal_id, message_id);

CREATE TABLE IF NOT EXISTS account_message_states (
  principal_id uuid NOT NULL REFERENCES account_principals(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  read_at timestamptz,
  dismissed_at timestamptz,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (principal_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_account_message_states_read
ON account_message_states (principal_id, read_at);

CREATE INDEX IF NOT EXISTS idx_account_message_states_dismissed
ON account_message_states (principal_id, dismissed_at);
