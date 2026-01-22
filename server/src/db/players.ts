import pool from './connection';
import { Player } from '../../../shared';

export async function getAllPlayers(): Promise<Player[]> {
  const query = 'SELECT * FROM players ORDER BY rank';
  const result = await pool.query(query);
  return result.rows;
}

export async function getPlayerById(playerId: string): Promise<Player | null> {
  const query = 'SELECT * FROM players WHERE id = $1';
  const result = await pool.query(query, [playerId]);
  return result.rows[0] || null;
}

export async function getAvailablePlayers(draftId: string): Promise<Player[]> {
  const query = `
    SELECT p.* FROM players p
    WHERE p.id NOT IN (
      SELECT player_id FROM picks WHERE draft_id = $1
    )
    ORDER BY p.rank
  `;
  
  const result = await pool.query(query, [draftId]);
  return result.rows;
}

export async function getBestAvailablePlayer(
  draftId: string
): Promise<Player | null> {
  const query = `
    SELECT p.* FROM players p
    WHERE p.id NOT IN (
      SELECT player_id FROM picks WHERE draft_id = $1
    )
    ORDER BY p.rank
    LIMIT 1
  `;
  
  const result = await pool.query(query, [draftId]);
  return result.rows[0] || null;
}