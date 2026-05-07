-- Migration 12: Add Google OAuth support to platform.accounts
-- Adds google_id, auth_provider columns; makes password nullable for OAuth-only accounts

ALTER TABLE platform.accounts
  ALTER COLUMN password DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS google_id    VARCHAR(150) UNIQUE,
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20)  NOT NULL DEFAULT 'local';

-- Index for fast Google ID lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_google_id
  ON platform.accounts (google_id)
  WHERE google_id IS NOT NULL;

-- username should be unique when set
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_username
  ON platform.accounts (username)
  WHERE username IS NOT NULL;

COMMENT ON COLUMN platform.accounts.auth_provider IS 'local | google';
COMMENT ON COLUMN platform.accounts.google_id IS 'Google sub (subject) from ID token';
