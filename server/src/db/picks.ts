import pool from './connection';
import { Pick } from '../../../shared';

export async function createPick(
  draftId: string,
  teamId: string,
  playerId: string,
  pickNumber: number,
  round: number
): Promise<Pick> {
  const query = `
    INSERT INTO picks (draft_id, team_id, player_id, pick_number, round)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  
  const result = await pool.query(query, [
    draftId,
    teamId,
    playerId,
    pickNumber,
    round
  ]);
  
  return result.rows[0];
}

export async function getPicksByDraftId(draftId: string): Promise<Pick[]> {
  const query = `
    SELECT * FROM picks 
    WHERE draft_id = $1 
    ORDER BY pick_number
  `;
  
  const result = await pool.query(query, [draftId]);
  return result.rows;
}

export async function isPlayerDrafted(
  draftId: string, 
  playerId: string
): Promise<boolean> {
  const query = `
    SELECT COUNT(*) as count 
    FROM picks 
    WHERE draft_id = $1 AND player_id = $2
  `;
  
  const result = await pool.query(query, [draftId, playerId]);
  return parseInt(result.rows[0].count) > 0;
}