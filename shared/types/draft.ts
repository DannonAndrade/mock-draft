export type DraftState = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';

export interface Draft {
  id: string;
  status: DraftState;
  teams_count: number;
  rounds: number;
  current_pick: number;
  created_at: Date;
}