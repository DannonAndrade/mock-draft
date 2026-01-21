export interface Team {
    id: string;
    draftId: string;
    name: string;
    userId: string | null;
    pickNumber: number;
    createdAt: Date;
  }