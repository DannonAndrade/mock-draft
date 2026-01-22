import pool from './connection';
import { Draft, DraftState, TEAM_COUNT, ROUND_COUNT } from '../../../shared';

export async function createDraft(): Promise<Draft> {
  const query = `
    INSERT INTO drafts (status, teams_count, rounds, current_pick)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  
  const values: [DraftState, number, number, number] = [
    'WAITING',
    TEAM_COUNT,
    ROUND_COUNT,
    1
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function getDraftById(draftId: string): Promise<Draft | null> {
  const query = 'SELECT * FROM drafts WHERE id = $1';
  const result = await pool.query(query, [draftId]);
  return result.rows[0] || null;
}

export async function updateDraftStatus(
  draftId: string, 
  status: DraftState
): Promise<Draft> {
  const query = `
    UPDATE drafts 
    SET status = $1 
    WHERE id = $2 
    RETURNING *
  `;
  
  const result = await pool.query(query, [status, draftId]);
  return result.rows[0];
}

export async function incrementCurrentPick(draftId: string): Promise<Draft> {
  const query = `
    UPDATE drafts 
    SET current_pick = current_pick + 1 
    WHERE id = $1 
    RETURNING *
  `;
  
  const result = await pool.query(query, [draftId]);
  return result.rows[0];
}