import pool from './connection';
import { Team } from '../../../shared';

export async function createTeam(
  draftId: string,
  name: string,
  pickNumber: number,
  userId: string | null = null
): Promise<Team> {
  const query = `
    INSERT INTO teams (draft_id, name, pick_number, user_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  
  const result = await pool.query(query, [draftId, name, pickNumber, userId]);
  return result.rows[0];
}

export async function getTeamsByDraftId(draftId: string): Promise<Team[]> {
  const query = 'SELECT * FROM teams WHERE draft_id = $1 ORDER BY pick_number';
  const result = await pool.query(query, [draftId]);
  return result.rows;
}

export async function getTeamByUserId(
  draftId: string, 
  userId: string
): Promise<Team | null> {
  const query = `
    SELECT * FROM teams 
    WHERE draft_id = $1 AND user_id = $2
  `;
  
  const result = await pool.query(query, [draftId, userId]);
  return result.rows[0] || null;
}

export async function assignUserToTeam(
  teamId: string, 
  userId: string
): Promise<Team> {
  const query = `
    UPDATE teams 
    SET user_id = $1 
    WHERE id = $2 
    RETURNING *
  `;
  
  const result = await pool.query(query, [userId, teamId]);
  return result.rows[0];
}

export async function getNextAvailableTeam(
  draftId: string
): Promise<Team | null> {
  const query = `
    SELECT * FROM teams 
    WHERE draft_id = $1 AND user_id IS NULL 
    ORDER BY pick_number 
    LIMIT 1
  `;
  
  const result = await pool.query(query, [draftId]);
  return result.rows[0] || null;
}