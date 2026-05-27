/**
 * Per-page meta (title + description) builders following the templates in
 * PROJECT_SPEC.md §9. Keeping these centralized makes titles consistent and
 * easy to tune for SEO.
 */
import type { Club, League, Match } from "./types.ts";
import { displaySeason, formatDate, formatScore } from "./format.ts";

const SITE = "IndexFootball";

export interface Meta {
  title: string;
  description: string;
}

export function leaguesIndexMeta(): Meta {
  return {
    title: `Football Leagues — Tables, Fixtures & Results - ${SITE}`,
    description:
      "Browse football leagues: standings, fixtures, results and season history across Europe's top competitions.",
  };
}

export function leagueHubMeta(league: League): Meta {
  return {
    title: `${league.name} — Tables, Fixtures & Seasons - ${SITE}`,
    description: `${league.name} (${league.country}) — season-by-season standings, fixtures and results. Browse every available ${league.name} season.`,
  };
}

export function leagueSeasonMeta(
  league: League,
  season: string,
  clubCount: number,
  matchCount: number,
): Meta {
  const s = displaySeason(season);
  return {
    title: `${league.name} ${s} Table, Fixtures & Results - ${SITE}`,
    description: `${league.name} ${s} — full standings, fixtures, results and stats. ${clubCount} clubs, ${matchCount} matches.`,
  };
}

export function clubsIndexMeta(count: number): Meta {
  return {
    title: `Football Clubs A–Z — Squads, History & Stats - ${SITE}`,
    description: `Browse ${count} football clubs: squads, season-by-season history, recent matches and stats.`,
  };
}

export function clubMeta(club: Club, leagues: League[]): Meta {
  const leagueNames = leagues.map((l) => l.name);
  const inLeague =
    leagueNames.length > 0 ? `plays in ${leagueNames.join(", ")}` : "";
  const founded =
    club.founded !== null ? `founded ${club.founded}, ` : "";
  const facts = [founded ? `${founded}${inLeague}` : inLeague]
    .filter(Boolean)
    .join("");
  const lead = `${club.name}, ${club.country} football club`;
  return {
    title: `${club.name} - Squad, History & Stats - ${SITE}`,
    description:
      `${lead}${facts ? `, ${facts}` : ""}. ` +
      "Squad, season history, recent matches and stats.",
  };
}

export function matchMeta(
  match: Match,
  home: Club,
  away: Club,
  league: League,
): Meta {
  const ft = match.score.ft;
  const score = ft ? `${ft.home}-${ft.away}` : "vs";
  const date = formatDate(match.date);
  const s = displaySeason(match.season);
  const resultSentence = ft
    ? `Final score ${formatScore(match)}.`
    : "Fixture details and head-to-head.";
  return {
    title: `${home.name} ${score} ${away.name} - ${date} - ${league.name} - ${SITE}`,
    description: `${home.name} vs ${away.name} on ${date} in ${league.name} ${s}. ${resultSentence} Match details, result and stats.`,
  };
}
