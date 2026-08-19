import pool from './connection';

export type FantasyBoardSettings = {
  name: string;
  season: number;
  scoring: 'PPR' | 'Half PPR' | 'Standard' | 'Superflex';
  draftOrder: 'Snake' | 'Linear' | 'Auction';
  leagueSize: number;
  draftPosition: number;
};

export type FantasyBoardState = {
  boardIds: string[];
  meta: Record<string, { note: string; target: boolean; avoid: boolean }>;
  tierBreakIds: string[];
  liveMode: boolean;
  draftLog: string[];
};

const columns = `id, name, season, scoring, draft_order AS "draftOrder",
  league_size AS "leagueSize", draft_position AS "draftPosition",
  board_state AS state, created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function listFantasyBoards(userId: string) {
  const result = await pool.query(
    `SELECT ${columns} FROM fantasy_boards WHERE user_id = $1 ORDER BY updated_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function getFantasyBoard(id: string, userId: string) {
  const result = await pool.query(
    `SELECT ${columns} FROM fantasy_boards WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return result.rows[0] ?? null;
}

export async function createFantasyBoard(userId: string, settings: FantasyBoardSettings) {
  const result = await pool.query(
    `INSERT INTO fantasy_boards (user_id, name, season, scoring, draft_order, league_size, draft_position)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${columns}`,
    [userId, settings.name, settings.season, settings.scoring, settings.draftOrder, settings.leagueSize, settings.draftPosition],
  );
  return result.rows[0];
}

export async function updateFantasyBoard(id: string, userId: string, state: FantasyBoardState) {
  const result = await pool.query(
    `UPDATE fantasy_boards SET board_state = $3, updated_at = NOW()
     WHERE id = $1 AND user_id = $2 RETURNING ${columns}`,
    [id, userId, JSON.stringify(state)],
  );
  return result.rows[0] ?? null;
}

export async function deleteFantasyBoard(id: string, userId: string) {
  const result = await pool.query('DELETE FROM fantasy_boards WHERE id = $1 AND user_id = $2', [id, userId]);
  return (result.rowCount ?? 0) > 0;
}
