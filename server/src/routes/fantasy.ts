import { Router } from 'express';

const router = Router();

const ESPN_SEASON = new Date().getFullYear();
const ESPN_URL = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${ESPN_SEASON}/players?scoringPeriodId=0&view=kona_player_info`;
const SLEEPER_PLAYERS_URL = 'https://api.sleeper.app/v1/players/nfl?active=true';
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

type SleeperPlayer = {
  player_id?: string;
  full_name?: string;
  espn_id?: string | number;
};

type SleeperIndex = {
  byEspnId: Map<string, SleeperPlayer>;
  byName: Map<string, SleeperPlayer>;
};

let cache: { expiresAt: number; players: ReturnType<typeof normalizePlayer>[] } | null = null;
let sleeperCache: { expiresAt: number; index: SleeperIndex } | null = null;

function normalizedName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function sleeperSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function getSleeperIndex(): Promise<SleeperIndex> {
  if (sleeperCache && sleeperCache.expiresAt > Date.now()) return sleeperCache.index;
  try {
    const response = await fetch(SLEEPER_PLAYERS_URL, { signal: AbortSignal.timeout(35_000) });
    if (!response.ok) throw new Error(`Sleeper returned ${response.status}`);
    const data = await response.json() as Record<string, SleeperPlayer>;
    const index: SleeperIndex = { byEspnId: new Map(), byName: new Map() };
    Object.entries(data).forEach(([id, rawPlayer]) => {
      const player = { ...rawPlayer, player_id: rawPlayer.player_id ?? id };
      if (player.espn_id != null && String(player.espn_id)) index.byEspnId.set(String(player.espn_id), player);
      if (player.full_name) index.byName.set(normalizedName(player.full_name), player);
    });
    sleeperCache = { expiresAt: Date.now() + 24 * 60 * 60 * 1000, index };
    return index;
  } catch (error) {
    console.error('Sleeper player index request failed:', error);
    return sleeperCache?.index ?? { byEspnId: new Map(), byName: new Map() };
  }
}

function seasonTotal(stats: EspnStat[] | undefined, season: number, projected: boolean) {
  return stats?.find((stat) =>
    stat.seasonId === season &&
    stat.scoringPeriodId === 0 &&
    stat.statSplitTypeId === 0 &&
    stat.statSourceId === (projected ? 1 : 0)
  )?.appliedTotal ?? null;
}

function normalizePlayer(player: EspnPlayer, sleeperIndex: SleeperIndex) {
  const ranks = player.draftRanksByRankType ?? {};
  const team = TEAM_ABBREVIATIONS[player.proTeamId ?? 0] ?? 'FA';
  const sleeperPlayer = sleeperIndex.byEspnId.get(String(player.id))
    ?? sleeperIndex.byName.get(normalizedName(player.fullName ?? ''));
  const sleeperId = sleeperPlayer?.player_id;
  const sleeperUrl = player.defaultPositionId === 16
    ? `https://sleeper.com/nfl/players/${team === 'WSH' ? 'was' : team.toLowerCase()}`
    : sleeperId
      ? `https://sleeper.com/nfl/players/${sleeperSlug(sleeperPlayer?.full_name ?? player.fullName ?? '')}-${sleeperId}`
      : null;
  return {
    id: String(player.id),
    name: player.fullName ?? 'Unknown player',
    position: POSITION_IDS[player.defaultPositionId ?? 0] ?? 'FLEX',
    team,
    pprRank: ranks.PPR?.rank ?? 9999,
    standardRank: ranks.STANDARD?.rank ?? ranks.PPR?.rank ?? 9999,
    superflexRank: ranks.SUPERFLEX?.rank ?? ranks.PPR?.rank ?? 9999,
    projectedPoints: seasonTotal(player.stats, ESPN_SEASON, true),
    lastSeasonPoints: seasonTotal(player.stats, ESPN_SEASON - 1, false),
    adp: player.ownership?.averageDraftPosition ?? null,
    auctionValue: ranks.PPR?.auctionValue ?? player.ownership?.auctionValueAverage ?? null,
    rostered: player.ownership?.percentOwned ?? null,
    injuryStatus: player.injuryStatus ?? (player.injured ? 'QUESTIONABLE' : 'ACTIVE'),
    headshot: player.defaultPositionId === 16
      ? null
      : `https://a.espncdn.com/i/headshots/nfl/players/full/${player.id}.png`,
    sleeperUrl,
  };
}

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
    const [response, sleeperIndex] = await Promise.all([
      fetch(ESPN_URL, {
        headers: { Accept: 'application/json', 'x-fantasy-filter': filter },
        signal: AbortSignal.timeout(35_000),
      }),
      getSleeperIndex(),
    ]);

    if (!response.ok) throw new Error(`ESPN returned ${response.status}`);
    const data = await response.json() as EspnPlayer[];
    const players = data
      .filter((player) => player.active && POSITION_IDS[player.defaultPositionId ?? 0])
      .map((player) => normalizePlayer(player, sleeperIndex))
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
