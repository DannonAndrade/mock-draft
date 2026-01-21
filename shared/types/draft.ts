export type DraftState = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';

export interface Draft {
  id: string;
  status: DraftState;
  teamsCount: number;
  rounds: number;
  currentPick: number;
  createdAt: Date;
}