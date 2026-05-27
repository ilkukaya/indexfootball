/**
 * Registry of data sources to fetch + process.
 *
 * Phase 2 is intentionally narrow: a single league/season (Premier League
 * 2024-25) used as the proving ground for the pipeline. Phase 6 scales this
 * list to the other top-5 leagues, UCL/UEL and ~20 seasons each — the parser
 * and processor already iterate over this array, so growth is additive.
 */
export interface LeagueSource {
  /** Stable league id/slug, e.g. "premier-league". */
  leagueId: string;
  name: string;
  country: string;
  countrySlug: string;
  tier: number;
  /** OpenFootball country repo, e.g. "england". */
  repo: string;
  /** Path of the season file inside the repo. */
  file: string;
  /** Normalized season slug, e.g. "2024-25". */
  season: string;
}

export const OPENFOOTBALL_ORG = "https://github.com/openfootball";

export const SOURCES: LeagueSource[] = [
  {
    leagueId: "premier-league",
    name: "Premier League",
    country: "England",
    countrySlug: "england",
    tier: 1,
    repo: "england",
    file: "2024-25/1-premierleague.txt",
    season: "2024-25",
  },
];

/** Unique set of OpenFootball repos referenced by SOURCES. */
export function repos(): string[] {
  return [...new Set(SOURCES.map((s) => s.repo))];
}
