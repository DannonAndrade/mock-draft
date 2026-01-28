export interface Team {
  id: string;
  draft_id: string;
  name: string;
  user_id: string | null;
  pick_number: number;
  created_at: Date;
}