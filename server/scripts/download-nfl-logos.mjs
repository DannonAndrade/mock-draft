/**
 * One-shot: fetch NFL teams from ESPN site API and save default logos to client/public.
 * Run: npm run download-nfl-logos (from server/)
 *
 * Usage in UI: /assets/nfl-logos/{abbr}.png e.g. /assets/nfl-logos/ari.png
 */
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../../client/public/assets/nfl-logos');
const TEAMS_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams';

async function main() {
  const res = await fetch(TEAMS_URL);
  if (!res.ok) {
    throw new Error(`Teams request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const teams = data?.sports?.[0]?.leagues?.[0]?.teams;
  if (!Array.isArray(teams) || teams.length === 0) {
    throw new Error('Unexpected ESPN response shape');
  }

  await mkdir(OUT_DIR, { recursive: true });

  let saved = 0;
  for (const { team } of teams) {
    if (!team?.abbreviation) continue;
    const abbr = team.abbreviation.toLowerCase();
    const logos = team.logos || [];
    const logo =
      logos.find((l) => l.rel?.includes('full') && l.rel?.includes('default')) ||
      logos[0];
    if (!logo?.href) {
      console.warn(`No logo for ${team.displayName ?? abbr}`);
      continue;
    }

    const imgRes = await fetch(logo.href);
    if (!imgRes.ok) {
      console.warn(`Failed to download ${abbr}: ${imgRes.status}`);
      continue;
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const ext = logo.href.includes('.png') ? 'png' : 'png';
    const filePath = join(OUT_DIR, `${abbr}.${ext}`);
    await writeFile(filePath, buf);
    console.log(`Wrote ${filePath} (${buf.length} bytes)`);
    saved++;
  }

  console.log(`Done. ${saved} logos in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
