/**
 * Registry of leagues to fetch + process, with per-league file layout so the
 * processor can auto-discover every available season in each OpenFootball repo.
 *
 * Two repo layouts are supported:
 *   - "seasonDir": <repo>/<YYYY-YY>/<file>          (england, deutschland, …)
 *   - "flat":      <repo>/<subdir>/<YYYY-YY>_<code>  (france and the euro repos)
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type Layout =
  | { kind: "seasonDir"; file: string }
  | { kind: "flat"; subdir: string; suffix: string };

export interface LeagueDef {
  leagueId: string;
  name: string;
  country: string;
  countrySlug: string;
  tier: number;
  /** OpenFootball repo to clone. */
  repo: string;
  layout: Layout;
  /** Optional inclusive lower bound on seasons (e.g. "2014-15") to cap scale. */
  minSeason?: string;
}

export const OPENFOOTBALL_ORG = "https://github.com/openfootball";

export const LEAGUES: LeagueDef[] = [
  {
    leagueId: "premier-league",
    name: "Premier League",
    country: "England",
    countrySlug: "england",
    tier: 1,
    repo: "england",
    layout: { kind: "seasonDir", file: "1-premierleague.txt" },
  },
  {
    leagueId: "bundesliga",
    name: "Bundesliga",
    country: "Germany",
    countrySlug: "germany",
    tier: 1,
    repo: "deutschland",
    layout: { kind: "seasonDir", file: "1-bundesliga.txt" },
  },
  {
    leagueId: "la-liga",
    name: "La Liga",
    country: "Spain",
    countrySlug: "spain",
    tier: 1,
    repo: "espana",
    layout: { kind: "seasonDir", file: "1-liga.txt" },
  },
  {
    leagueId: "serie-a",
    name: "Serie A",
    country: "Italy",
    countrySlug: "italy",
    tier: 1,
    repo: "italy",
    layout: { kind: "seasonDir", file: "1-seriea.txt" },
  },
  {
    leagueId: "ligue-1",
    name: "Ligue 1",
    country: "France",
    countrySlug: "france",
    tier: 1,
    repo: "france",
    layout: { kind: "flat", subdir: "france", suffix: "_fr1.txt" },
  },
];

/** Unique set of OpenFootball repos referenced by LEAGUES. */
export function repos(): string[] {
  return [...new Set(LEAGUES.map((l) => l.repo))];
}

const SEASON_DIR_RE = /^\d{4}-\d{2}$/;

export interface DiscoveredSeason {
  season: string;
  path: string;
}

/**
 * Discover every available (season, file path) for a league inside its cloned
 * repo, honoring an optional minSeason floor. Returns oldest-first.
 */
export function discoverSeasons(
  def: LeagueDef,
  repoDir: string,
): DiscoveredSeason[] {
  const out: DiscoveredSeason[] = [];

  if (def.layout.kind === "seasonDir") {
    const { file } = def.layout;
    if (!existsSync(repoDir)) return out;
    for (const entry of readdirSync(repoDir)) {
      if (!SEASON_DIR_RE.test(entry)) continue;
      const path = join(repoDir, entry, file);
      if (existsSync(path)) out.push({ season: entry, path });
    }
  } else {
    const { subdir, suffix } = def.layout;
    const dir = join(repoDir, subdir);
    if (!existsSync(dir)) return out;
    for (const entry of readdirSync(dir)) {
      if (!entry.endsWith(suffix)) continue;
      const season = entry.slice(0, -suffix.length);
      if (!SEASON_DIR_RE.test(season)) continue;
      out.push({ season, path: join(dir, entry) });
    }
  }

  return out
    .filter((s) => !def.minSeason || s.season >= def.minSeason)
    .sort((a, b) => a.season.localeCompare(b.season));
}
