BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider, provider_user_id),
  UNIQUE (user_id, provider)
);

ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS teams_one_seat_per_user
  ON teams (draft_id, user_id)
  WHERE user_id IS NOT NULL;

-- Existing browser-generated IDs cannot be authenticated. This NOT VALID
-- constraint protects all new assignments without deleting old draft data.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teams_user_id_users_fk'
  ) THEN
    ALTER TABLE teams
      ADD CONSTRAINT teams_user_id_users_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

COMMIT;
