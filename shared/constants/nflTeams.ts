/** Official NFL franchises in alphabetical order (pick slots 1–32, round 1). */
export const NFL_TEAM_NAMES = [
  'Arizona Cardinals',
  'Atlanta Falcons',
  'Baltimore Ravens',
  'Buffalo Bills',
  'Carolina Panthers',
  'Chicago Bears',
  'Cincinnati Bengals',
  'Cleveland Browns',
  'Dallas Cowboys',
  'Denver Broncos',
  'Detroit Lions',
  'Green Bay Packers',
  'Houston Texans',
  'Indianapolis Colts',
  'Jacksonville Jaguars',
  'Kansas City Chiefs',
  'Las Vegas Raiders',
  'Los Angeles Chargers',
  'Los Angeles Rams',
  'Miami Dolphins',
  'Minnesota Vikings',
  'New England Patriots',
  'New Orleans Saints',
  'New York Giants',
  'New York Jets',
  'Philadelphia Eagles',
  'Pittsburgh Steelers',
  'San Francisco 49ers',
  'Seattle Seahawks',
  'Tampa Bay Buccaneers',
  'Tennessee Titans',
  'Washington Commanders',
] as const;

export type NflTeamName = (typeof NFL_TEAM_NAMES)[number];


export const NFL_TEAM_LOGO_ABBREVIATIONS = [
  'ari',
  'atl',
  'bal',
  'buf',
  'car',
  'chi',
  'cin',
  'cle',
  'dal',
  'den',
  'det',
  'gb',
  'hou',
  'ind',
  'jax',
  'kc',
  'lv',
  'lac',
  'lar',
  'mia',
  'min',
  'ne',
  'no',
  'nyg',
  'nyj',
  'phi',
  'pit',
  'sf',
  'sea',
  'tb',
  'ten',
  'wsh',
] as const;

/** Public URL path for Vite `public/` assets. */
export function getNflTeamLogoSrc(teamName: string): string | undefined {
  const names = NFL_TEAM_NAMES as readonly string[];
  const abbreviations = NFL_TEAM_LOGO_ABBREVIATIONS as readonly string[];
  const normalized = teamName.toLowerCase();
  const i = names.indexOf(teamName) >= 0 ? names.indexOf(teamName) : abbreviations.indexOf(normalized);
  if (i === -1) return undefined;
  const abbr = NFL_TEAM_LOGO_ABBREVIATIONS[i];
  return `/assets/nfl-logos/${abbr}.png`;
}

export const AFC_TEAMS = [
  'Baltimore Ravens',
  'Buffalo Bills',
  'Cincinnati Bengals',
  'Cleveland Browns',
  'Denver Broncos',
  'Houston Texans',
  'Indianapolis Colts',
  'Jacksonville Jaguars',
  'Kansas City Chiefs',
  'Las Vegas Raiders',
  'Los Angeles Chargers',
  'Miami Dolphins',
  'New England Patriots',
  'New York Jets',
  'Pittsburgh Steelers',
  'Tennessee Titans',
] as const;

export const NFC_TEAMS = [
  'Arizona Cardinals',
  'Atlanta Falcons',
  'Carolina Panthers',
  'Chicago Bears',
  'Dallas Cowboys',
  'Detroit Lions',
  'Green Bay Packers',
  'Los Angeles Rams',
  'Minnesota Vikings',
  'New Orleans Saints',
  'New York Giants',
  'Philadelphia Eagles',
  'San Francisco 49ers',
  'Seattle Seahawks',
  'Tampa Bay Buccaneers',
  'Washington Commanders',
] as const;
