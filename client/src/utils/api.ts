const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type FantasyPlayer = {
  id: string;
  name: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'D/ST';
  team: string;
  pprRank: number;
  standardRank: number;
  superflexRank: number;
  projectedPoints: number | null;
  lastSeasonPoints: number | null;
  adp: number | null;
  auctionValue: number | null;
  rostered: number | null;
  injuryStatus: string;
  headshot: string | null;
  sleeperUrl: string | null;
};

export async function getFantasyPlayers() {
  const response = await fetch(`${API_URL}/fantasy/players`, { credentials: 'include' });
  if (!response.ok) throw new Error('ESPN fantasy rankings are unavailable');
  return response.json() as Promise<{ season: number; source: string; players: FantasyPlayer[] }>;
}

export async function createDraft() {
  const response = await fetch(`${API_URL}/drafts`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error('Failed to create draft');
  }

  return response.json();
}

export async function joinDraft(draftId: string) {
  const response = await fetch(`${API_URL}/drafts/${draftId}/join`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join draft');
  }

  return response.json();
}

export async function getAvailablePlayers(draftId: string) {
  const response = await fetch(`${API_URL}/picks/players/${draftId}`, { credentials: 'include' });
  
  if (!response.ok) {
    throw new Error('Failed to fetch players');
  }
  
  return response.json();
}

export async function makePick(draftId: string, playerId: string) {
  const response = await fetch(`${API_URL}/picks`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draftId, playerId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to make pick');
  }

  return response.json();
}

export async function startDraft(draftId: string) {
  const response = await fetch(`${API_URL}/drafts/${draftId}/start`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start draft');
  }

  return response.json();
}
