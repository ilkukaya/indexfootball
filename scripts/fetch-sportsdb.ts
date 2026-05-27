/**
 * Enrich clubs with metadata + crest images from TheSportsDB (free tier).
 *
 * Reads the processed club list, queries searchteams.php per club, and:
 *   - caches the raw API response in data/raw/sportsdb/ (git-ignored)
 *   - downloads the crest to public/images/clubs/<slug>.png (committed)
 *   - writes a committed enrichment map to data/sportsdb/clubs.json
 *
 * The committed enrichment + crests are the durable cache, so normal builds
 * (`npm run process`) never need to hit the API. Re-run this script to refresh
 * metadata; set REFETCH=1 to ignore the existing cache.
 *
 * Run order: `npm run fetch:all && npm run process` (to create clubs.json)
 * then `npm run enrich:sportsdb`, then `npm run process` again to bake it in.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fetchBuffer, fetchJson } from "./lib/http.ts";
import type { Club } from "../src/lib/types.ts";

const KEY = process.env.SPORTSDB_KEY || "3";
const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}`;
const ROOT = process.cwd();
const PROCESSED = join(ROOT, "data", "processed", "clubs.json");
const RAW_DIR = join(ROOT, "data", "raw", "sportsdb", "teams");
const META_FILE = join(ROOT, "data", "sportsdb", "clubs.json");
const IMG_DIR = join(ROOT, "public", "images", "clubs");
const force = process.env.REFETCH === "1";

interface TeamMeta {
  founded: number | null;
  stadium: string | null;
  location: string | null;
}
type MetaMap = Record<string, TeamMeta>;

interface SportsDbTeam {
  strTeam?: string;
  strSport?: string;
  strCountry?: string;
  intFormedYear?: string;
  strStadium?: string;
  strLocation?: string;
  strBadge?: string;
}

function pickTeam(
  teams: SportsDbTeam[],
  club: Club,
): SportsDbTeam | undefined {
  const soccer = teams.filter((t) => t.strSport === "Soccer");
  const pool = soccer.length ? soccer : teams;
  return (
    pool.find((t) => t.strCountry === club.country) ??
    pool.find((t) => (t.strTeam ?? "").toLowerCase() === club.name.toLowerCase()) ??
    pool[0]
  );
}

async function search(name: string): Promise<SportsDbTeam[]> {
  const url = `${BASE}/searchteams.php?t=${encodeURIComponent(name)}`;
  const data = await fetchJson<{ teams: SportsDbTeam[] | null }>(url);
  return data.teams ?? [];
}

async function downloadCrest(url: string, slug: string): Promise<void> {
  const dest = join(IMG_DIR, `${slug}.png`);
  if (existsSync(dest)) return;
  const buf = await fetchBuffer(url);
  writeFileSync(dest, buf);
  console.log(`  ↓ crest ${slug}.png`);
}

async function main(): Promise<void> {
  if (!existsSync(PROCESSED)) {
    throw new Error(
      `Missing ${PROCESSED}. Run \`npm run fetch:all && npm run process\` first.`,
    );
  }
  const clubs = JSON.parse(readFileSync(PROCESSED, "utf8")) as Club[];

  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(IMG_DIR, { recursive: true });
  mkdirSync(join(ROOT, "data", "sportsdb"), { recursive: true });

  const meta: MetaMap = existsSync(META_FILE)
    ? (JSON.parse(readFileSync(META_FILE, "utf8")) as MetaMap)
    : {};

  for (const club of clubs) {
    const hasCrest = existsSync(join(IMG_DIR, `${club.slug}.png`));
    if (!force && meta[club.slug] && hasCrest) {
      console.log(`✓ ${club.name} (cached)`);
      continue;
    }

    console.log(`· ${club.name}`);
    try {
      let teams = await search(club.name);
      if (teams.length === 0) teams = await search(`${club.name} FC`);
      const team = pickTeam(teams, club);

      if (!team) {
        console.warn(`  no match for ${club.name}`);
        continue;
      }

      writeFileSync(
        join(RAW_DIR, `${club.slug}.json`),
        `${JSON.stringify(team, null, 2)}\n`,
      );

      const founded = team.intFormedYear
        ? parseInt(team.intFormedYear, 10)
        : null;
      meta[club.slug] = {
        founded: Number.isFinite(founded) ? founded : null,
        stadium: team.strStadium || null,
        location: team.strLocation || null,
      };

      if (team.strBadge) await downloadCrest(team.strBadge, club.slug);
    } catch (error) {
      console.warn(`  failed for ${club.name}: ${String(error)}`);
    }
  }

  const sorted: MetaMap = {};
  for (const slug of Object.keys(meta).sort()) sorted[slug] = meta[slug];
  writeFileSync(META_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(
    `\nWrote enrichment for ${Object.keys(sorted).length} club(s) to data/sportsdb/clubs.json`,
  );
}

main();
