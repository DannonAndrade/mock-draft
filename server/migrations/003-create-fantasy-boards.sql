BEGIN;

CREATE TABLE IF NOT EXISTS fantasy_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  season INTEGER NOT NULL,
  scoring TEXT NOT NULL CHECK (scoring IN ('PPR', 'Half PPR', 'Standard', 'Superflex')),
  draft_order TEXT NOT NULL CHECK (draft_order IN ('Snake', 'Linear', 'Auction')),
  league_size INTEGER NOT NULL CHECK (league_size IN (8, 10, 12, 14, 16)),
  draft_position INTEGER NOT NULL CHECK (draft_position BETWEEN 1 AND 16),
  board_state JSONB NOT NULL DEFAULT '{"boardIds":[],"meta":{},"tierBreakIds":[],"liveMode":false,"draftLog":[]}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (draft_position <= league_size)
);

CREATE INDEX IF NOT EXISTS fantasy_boards_user_updated_idx
  ON fantasy_boards (user_id, updated_at DESC);

COMMIT;
