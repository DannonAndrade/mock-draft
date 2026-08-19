import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import {
  createFantasyBoard, deleteFantasyBoard, getFantasyBoard, listFantasyBoards, updateFantasyBoard,
  type FantasyBoardSettings, type FantasyBoardState,
} from '../db/fantasyBoards';

const router = Router();

const ESPN_SEASON = new Date().getFullYear();
const ESPN_URL = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${ESPN_SEASON}/players?scoringPeriodId=0&view=kona_player_info`;
const ESPN_PREVIOUS_SEASON_URL = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${ESPN_SEASON - 1}/players?scoringPeriodId=0&view=kona_player_info`;
const POSITION_IDS: Record<number, string> = {
  1: 'QB',
  2: 'RB',
  3: 'WR',
  4: 'TE',
  5: 'K',
  16: 'D/ST',
};

const TEAM_ABBREVIATIONS: Record<number, string> = {
  0: 'FA', 1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE', 6: 'DAL',
  7: 'DEN', 8: 'DET', 9: 'GB', 10: 'TEN', 11: 'IND', 12: 'KC', 13: 'LV',
  14: 'LAR', 15: 'MIA', 16: 'MIN', 17: 'NE', 18: 'NO', 19: 'NYG',
  20: 'NYJ', 21: 'PHI', 22: 'ARI', 23: 'PIT', 24: 'LAC', 25: 'SF',
  26: 'SEA', 27: 'TB', 28: 'WSH', 29: 'CAR', 30: 'JAX', 33: 'BAL', 34: 'HOU',
};

type EspnStat = {
  seasonId?: number;
  scoringPeriodId?: number;
  statSourceId?: number;
  statSplitTypeId?: number;
  appliedTotal?: number;
  stats?: Record<string, number>;
};

type EspnPlayer = {
  id: number;
  active?: boolean;
  fullName?: string;
  defaultPositionId?: number;
  proTeamId?: number;
  injuryStatus?: string;
  injured?: boolean;
  ownership?: {
    averageDraftPosition?: number;
    auctionValueAverage?: number;
    percentOwned?: number;
  };
  draftRanksByRankType?: Record<string, { rank?: number; auctionValue?: number }>;
  stats?: EspnStat[];
};

type EspnGameLogEvent = {
  id: string;
  week?: number;
  atVs?: string;
  gameDate?: string;
  score?: string;
  gameResult?: string;
  opponent?: { abbreviation?: string; displayName?: string };
  links?: Array<{ rel?: string[]; href?: string }>;
};

type EspnGameLog = {
  names?: string[];
  events?: Record<string, EspnGameLogEvent>;
  seasonTypes?: Array<{ categories?: Array<{ type?: string; events?: Array<{ eventId: string; stats?: string[] }> }> }>;
};

let cache: { expiresAt: number; players: ReturnType<typeof normalizePlayer>[] } | null = null;
const gameLogCache = new Map<string, { expiresAt: number; games: NormalizedGameLog[] }>();

type NormalizedGameLog = {
  id: string;
  week: number;
  date: string | null;
  opponent: string;
  location: '@' | 'vs';
  result: string;
  score: string;
  stats: Record<string, number>;
  boxScoreUrl: string | null;
};

const scoringOptions = new Set(['PPR', 'Half PPR', 'Standard', 'Superflex']);
const draftOrderOptions = new Set(['Snake', 'Linear', 'Auction']);
const leagueSizeOptions = new Set([8, 10, 12, 14, 16]);

function validSettings(body: Partial<FantasyBoardSettings>): body is FantasyBoardSettings {
  return typeof body.name === 'string' && body.name.trim().length > 0 && body.name.trim().length <= 80
    && Number.isInteger(body.season) && body.season! >= 2020 && body.season! <= 2100
    && scoringOptions.has(String(body.scoring))
    && draftOrderOptions.has(String(body.draftOrder))
    && leagueSizeOptions.has(Number(body.leagueSize))
    && Number.isInteger(body.draftPosition) && body.draftPosition! >= 1 && body.draftPosition! <= body.leagueSize!;
}

function validState(body: unknown): body is FantasyBoardState {
  if (!body || typeof body !== 'object') return false;
  const state = body as Partial<FantasyBoardState>;
  return Array.isArray(state.boardIds) && state.boardIds.every((id) => typeof id === 'string')
    && Boolean(state.meta) && typeof state.meta === 'object' && !Array.isArray(state.meta)
    && Array.isArray(state.tierBreakIds) && state.tierBreakIds.every((id) => typeof id === 'string')
    && typeof state.liveMode === 'boolean'
    && Array.isArray(state.draftLog) && state.draftLog.every((id) => typeof id === 'string');
}

function statNumber(value: string | undefined) {
  if (!value || value === '-') return 0;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function fantasyPoints(stats: Record<string, number>, scoring: string) {
  if ('totalKickingPoints' in stats || 'fieldGoalsMade' in stats) {
    return Number((
      (stats.fieldGoalsMade1_19 ?? 0) * 3
      + (stats.fieldGoalsMade20_29 ?? 0) * 3
      + (stats.fieldGoalsMade30_39 ?? 0) * 3
      + (stats.fieldGoalsMade40_49 ?? 0) * 4
      + (stats.fieldGoalsMade50 ?? 0) * 5
      + (stats.extraPointsMade ?? 0)
    ).toFixed(1));
  }
  const receptionPoints = scoring === 'PPR' || scoring === 'Superflex' ? 1 : scoring === 'Half PPR' ? 0.5 : 0;
  return Number((
    (stats.passingYards ?? 0) / 25
    + (stats.passingTouchdowns ?? 0) * 4
    - (stats.interceptions ?? stats.passingInterceptions ?? 0) * 2
    + ((stats.rushingYards ?? 0) + (stats.receivingYards ?? 0)) / 10
    + ((stats.rushingTouchdowns ?? 0) + (stats.receivingTouchdowns ?? 0)) * 6
    + (stats.receptions ?? 0) * receptionPoints
    - (stats.fumblesLost ?? 0) * 2
    + (stats.twoPointPassConvs ?? 0) * 2
    + (stats.twoPointRushConvs ?? 0) * 2
    + (stats.twoPointRecConvs ?? 0) * 2
  ).toFixed(1));
}

async function loadGameLog(playerId: string, season: number) {
  const cacheKey = `${playerId}:${season}`;
  const cached = gameLogCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.games;

  const url = `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${encodeURIComponent(playerId)}/gamelog?region=us&lang=en&contentorigin=espn&season=${season}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`ESPN returned ${response.status}`);
  const data = await response.json() as EspnGameLog;
  const statNames = data.names ?? [];
  const statEvents = data.seasonTypes
    ?.flatMap((seasonType) => seasonType.categories ?? [])
    .filter((category) => category.type === 'event')
    .flatMap((category) => category.events ?? []) ?? [];

  const games = statEvents.map((entry): NormalizedGameLog | null => {
    const event = data.events?.[entry.eventId];
    if (!event) return null;
    const stats: Record<string, number> = {};
    statNames.forEach((name, index) => {
      const value = entry.stats?.[index];
      const compoundNames = name.split('-');
      const compoundValues = value?.split('-') ?? [];
      if (compoundNames.length === 2 && compoundValues.length === 2) {
        stats[compoundNames[0]] = statNumber(compoundValues[0]);
        stats[compoundNames[1]] = statNumber(compoundValues[1]);
      } else {
        stats[name] = statNumber(value);
      }
    });
    return {
      id: event.id,
      week: event.week ?? 0,
      date: event.gameDate ?? null,
      opponent: event.opponent?.abbreviation ?? event.opponent?.displayName ?? '—',
      location: event.atVs === '@' ? '@' : 'vs',
      result: event.gameResult ?? '—',
      score: event.score ?? '—',
      stats,
      boxScoreUrl: event.links?.find((link) => link.rel?.includes('boxscore') && link.href?.startsWith('https://'))?.href ?? null,
    };
  }).filter((game): game is NormalizedGameLog => Boolean(game)).sort((a, b) => a.week - b.week);

  gameLogCache.set(cacheKey, { expiresAt: Date.now() + 24 * 60 * 60 * 1000, games });
  return games;
}

function pprTotalFromEspnStats(stats: Record<string, number> | undefined, positionId?: number) {
  if (!stats || Object.keys(stats).length === 0) return null;
  if (positionId === 5 || positionId === 16) return null;
  const value = (id: number) => stats[String(id)] ?? 0;
  return Number((
    value(3) / 25
    + value(4) * 4
    - value(20) * 2
    + value(24) / 10
    + value(25) * 6
    + value(26) * 2
    + value(42) / 10
    + value(43) * 6
    + value(44) * 2
    + value(53)
    - value(73) * 2
  ).toFixed(1));
}

function seasonTotal(stats: EspnStat[] | undefined, season: number, projected: boolean, positionId?: number) {
  const seasonStats = stats?.find((stat) =>
    stat.seasonId === season &&
    stat.scoringPeriodId === 0 &&
    stat.statSplitTypeId === 0 &&
    stat.statSourceId === (projected ? 1 : 0)
  );
  return pprTotalFromEspnStats(seasonStats?.stats, positionId) ?? seasonStats?.appliedTotal ?? null;
}

async function getPreviousSeasonTotals(filter: string) {
  try {
    const response = await fetch(ESPN_PREVIOUS_SEASON_URL, {
      headers: { Accept: 'application/json', 'x-fantasy-filter': filter },
      signal: AbortSignal.timeout(35_000),
    });
    if (!response.ok) throw new Error(`ESPN returned ${response.status}`);
    const players = await response.json() as EspnPlayer[];
    const totals = new Map<number, number>();
    players.forEach((player) => {
      const total = seasonTotal(player.stats, ESPN_SEASON - 1, false, player.defaultPositionId);
      if (total != null) totals.set(player.id, total);
    });
    return totals;
  } catch (error) {
    console.error('Previous-season ESPN request failed:', error);
    return new Map<number, number>();
  }
}

function normalizePlayer(player: EspnPlayer, previousSeasonTotals: Map<number, number>) {
  const ranks = player.draftRanksByRankType ?? {};
  const team = TEAM_ABBREVIATIONS[player.proTeamId ?? 0] ?? 'FA';
  const espnUrl = player.defaultPositionId === 16
    ? `https://www.espn.com/nfl/team/_/name/${team.toLowerCase()}`
    : `https://www.espn.com/nfl/player/_/id/${player.id}`;
  return {
    id: String(player.id),
    name: player.fullName ?? 'Unknown player',
    position: POSITION_IDS[player.defaultPositionId ?? 0] ?? 'FLEX',
    team,
    pprRank: ranks.PPR?.rank ?? 9999,
    standardRank: ranks.STANDARD?.rank ?? ranks.PPR?.rank ?? 9999,
    superflexRank: ranks.SUPERFLEX?.rank ?? ranks.PPR?.rank ?? 9999,
    projectedPoints: seasonTotal(player.stats, ESPN_SEASON, true, player.defaultPositionId),
    lastSeasonPoints: previousSeasonTotals.get(player.id)
      ?? seasonTotal(player.stats, ESPN_SEASON - 1, false, player.defaultPositionId),
    adp: player.ownership?.averageDraftPosition ?? null,
    auctionValue: ranks.PPR?.auctionValue ?? player.ownership?.auctionValueAverage ?? null,
    rostered: player.ownership?.percentOwned ?? null,
    injuryStatus: player.injuryStatus ?? (player.injured ? 'QUESTIONABLE' : 'ACTIVE'),
    headshot: player.defaultPositionId === 16
      ? null
      : `https://a.espncdn.com/i/headshots/nfl/players/full/${player.id}.png`,
    espnUrl,
  };
}

router.get('/boards', requireAuth, async (req, res, next) => {
  try {
    res.json({ boards: await listFantasyBoards(req.user!.id) });
  } catch (error) {
    next(error);
  }
});

router.post('/boards', requireAuth, async (req, res, next) => {
  try {
    if (!validSettings(req.body)) return res.status(400).json({ error: 'Invalid draft board settings' });
    const board = await createFantasyBoard(req.user!.id, { ...req.body, name: req.body.name.trim() });
    res.status(201).json({ board });
  } catch (error) {
    next(error);
  }
});

router.get('/boards/:id', requireAuth, async (req, res, next) => {
  try {
    const board = await getFantasyBoard(String(req.params.id), req.user!.id);
    if (!board) return res.status(404).json({ error: 'Draft board not found' });
    res.json({ board });
  } catch (error) {
    next(error);
  }
});

router.put('/boards/:id', requireAuth, async (req, res, next) => {
  try {
    if (!validState(req.body.state)) return res.status(400).json({ error: 'Invalid draft board state' });
    const board = await updateFantasyBoard(String(req.params.id), req.user!.id, req.body.state);
    if (!board) return res.status(404).json({ error: 'Draft board not found' });
    res.json({ board });
  } catch (error) {
    next(error);
  }
});

router.delete('/boards/:id', requireAuth, async (req, res, next) => {
  try {
    if (!await deleteFantasyBoard(String(req.params.id), req.user!.id)) {
      return res.status(404).json({ error: 'Draft board not found' });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get('/players/:playerId/game-log', async (req, res) => {
  const playerId = String(req.params.playerId);
  const season = Number(req.query.season ?? ESPN_SEASON - 1);
  const scoring = String(req.query.scoring ?? 'PPR');
  if (!/^\d+$/.test(playerId) || !Number.isInteger(season) || season < 2000 || season > ESPN_SEASON) {
    return res.status(400).json({ error: 'Invalid player or season' });
  }
  if (!scoringOptions.has(scoring)) return res.status(400).json({ error: 'Invalid scoring setting' });

  try {
    const games = (await loadGameLog(playerId, season)).map((game) => ({
      ...game,
      fantasyPoints: fantasyPoints(game.stats, scoring),
    }));
    res.json({ season, source: 'ESPN', games });
  } catch (error) {
    console.error('ESPN player game-log request failed:', error);
    res.status(502).json({ error: 'Player game log is temporarily unavailable' });
  }
});

router.get('/players', async (_req, res) => {
  try {
    if (cache && cache.expiresAt > Date.now()) {
      return res.json({ season: ESPN_SEASON, source: 'ESPN', players: cache.players });
    }

    const filter = JSON.stringify({
      players: {
        filterActive: { value: true },
        limit: 1000,
        sortDraftRanks: { sortPriority: 1, sortAsc: true, value: 'PPR' },
      },
    });
    const [response, previousSeasonTotals] = await Promise.all([
      fetch(ESPN_URL, {
        headers: { Accept: 'application/json', 'x-fantasy-filter': filter },
        signal: AbortSignal.timeout(35_000),
      }),
      getPreviousSeasonTotals(filter),
    ]);

    if (!response.ok) throw new Error(`ESPN returned ${response.status}`);
    const data = await response.json() as EspnPlayer[];
    const players = data
      .filter((player) => player.active && POSITION_IDS[player.defaultPositionId ?? 0])
      .map((player) => normalizePlayer(player, previousSeasonTotals))
      .filter((player) => player.pprRank < 9999)
      .sort((a, b) => a.pprRank - b.pprRank)
      .slice(0, 250);

    if (players.length < 100) throw new Error('ESPN returned fewer than 100 ranked players');
    cache = { expiresAt: Date.now() + 15 * 60 * 1000, players };
    return res.json({ season: ESPN_SEASON, source: 'ESPN', players });
  } catch (error) {
    console.error('ESPN fantasy player request failed:', error);
    return res.status(502).json({
      error: 'Fantasy rankings are temporarily unavailable',
      details: error instanceof Error ? error.message : 'Unknown ESPN error',
    });
  }
});

export default router;
