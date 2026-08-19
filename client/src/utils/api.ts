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
  espnUrl: string;
};

export type FantasyGameLogEntry = {
  id: string;
  week: number;
  date: string | null;
  opponent: string;
  location: '@' | 'vs';
  result: string;
  score: string;
  stats: Record<string, number>;
  fantasyPoints: number;
  boxScoreUrl: string | null;
};

export type FantasyGameLog = {
  season: number;
  source: string;
  games: FantasyGameLogEntry[];
};

export type FantasyBoardState = {
  boardIds: string[];
  meta: Record<string, { note: string; target: boolean; avoid: boolean }>;
  tierBreakIds: string[];
  liveMode: boolean;
  draftLog: string[];
};

export type FantasyBoard = {
  id: string;
  name: string;
  season: number;
  scoring: 'PPR' | 'Half PPR' | 'Standard' | 'Superflex';
  draftOrder: 'Snake' | 'Linear' | 'Auction';
  leagueSize: number;
  draftPosition: number;
  state: FantasyBoardState;
  createdAt: string;
  updatedAt: string;
};

async function fantasyBoardRequest<T>(path: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}/fantasy/boards${path}`, {
    credentials: 'include',
    ...options,
    headers: options?.body ? { 'Content-Type': 'application/json', ...options.headers } : options?.headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || 'Unable to save fantasy draft board');
  }
  return (response.status === 204 ? undefined : response.json()) as Promise<T>;
}

export async function listFantasyBoards() {
  return fantasyBoardRequest<{ boards: FantasyBoard[] }>('');
}

export async function getFantasyBoard(id: string) {
  return fantasyBoardRequest<{ board: FantasyBoard }>(`/${id}`);
}

export async function createFantasyBoard(settings: Pick<FantasyBoard, 'name' | 'season' | 'scoring' | 'draftOrder' | 'leagueSize' | 'draftPosition'>) {
  return fantasyBoardRequest<{ board: FantasyBoard }>('', { method: 'POST', body: JSON.stringify(settings) });
}

export async function updateFantasyBoard(id: string, state: FantasyBoardState) {
  return fantasyBoardRequest<{ board: FantasyBoard }>(`/${id}`, { method: 'PUT', body: JSON.stringify({ state }) });
}

export async function deleteFantasyBoard(id: string) {
  return fantasyBoardRequest<void>(`/${id}`, { method: 'DELETE' });
}

export async function getFantasyPlayers() {
  const response = await fetch(`${API_URL}/fantasy/players`, { credentials: 'include' });
  if (!response.ok) throw new Error('ESPN fantasy rankings are unavailable');
  return response.json() as Promise<{ season: number; source: string; players: FantasyPlayer[] }>;
}

export async function getFantasyPlayerGameLog(playerId: string, season: number, scoring: FantasyBoard['scoring']) {
  const params = new URLSearchParams({ season: String(season), scoring });
  const response = await fetch(`${API_URL}/fantasy/players/${encodeURIComponent(playerId)}/game-log?${params}`, { credentials: 'include' });
  if (!response.ok) throw new Error('Player game log is unavailable');
  return response.json() as Promise<FantasyGameLog>;
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
