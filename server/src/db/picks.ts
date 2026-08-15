import pool from './connection';
import { Pick, Player } from '../../../shared';

export type PickWithPlayer = Pick & { player: Player | null };

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

export async function getPicksByDraftId(draftId: string): Promise<PickWithPlayer[]> {
  const query = `
    SELECT 
      p.*,
      pl.name AS player_name,
      pl.position AS player_position,
      pl.team AS player_team,
      pl.rank AS player_rank,
      pl.created_at AS player_created_at
    FROM picks p
    LEFT JOIN players pl ON pl.id = p.player_id
    WHERE p.draft_id = $1 
    ORDER BY p.pick_number
  `;
  
  const result = await pool.query(query, [draftId]);
  return result.rows.map((row) => ({
    id: row.id,
    draft_id: row.draft_id,
    team_id: row.team_id,
    player_id: row.player_id,
    pick_number: row.pick_number,
    round: row.round,
    created_at: row.created_at,
    player: row.player_name
      ? {
          id: row.player_id,
          name: row.player_name,
          position: row.player_position,
          team: row.player_team,
          rank: row.player_rank,
          created_at: row.player_created_at,
        }
      : null,
  }));
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