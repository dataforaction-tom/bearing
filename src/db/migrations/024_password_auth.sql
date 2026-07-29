-- 024: Password-based auth (NextAuth/Auth.js Credentials provider)
--
-- Adds password_hash to users (nullable — the existing magic-link users have
-- NULL until they complete the "set your password" flow) and a purpose-built
-- token table for that flow. The old magic_tokens table (002) is not reused:
-- its shape doesn't fit this table's needs and it's being retired separately
-- once the new auth flow is confirmed stable (see migration 025).

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,
  purpose     TEXT NOT NULL DEFAULT 'set_password',
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash
  ON password_reset_tokens(token_hash);
