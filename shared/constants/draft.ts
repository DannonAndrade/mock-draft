import { NFL_TEAM_NAMES } from './nflTeams';

export const TEAM_COUNT = NFL_TEAM_NAMES.length;
export const ROUND_COUNT = 3 as const;

export const TOTAL_PICKS = TEAM_COUNT * ROUND_COUNT;
