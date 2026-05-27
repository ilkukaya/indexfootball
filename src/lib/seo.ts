/**
 * Per-page meta (title + description) builders following the templates in
 * PROJECT_SPEC.md §9. Keeping these centralized makes titles consistent and
 * easy to tune for SEO.
 */
import type { Club, League, Match, Standing } from "./types.ts";
import { displaySeason, formatDate, formatScore } from "./format.ts";

const SITE = "IndexFootball";

export interface Meta {
  title: string;
  description: string;
}

type Schema = Record<string, unknown>;

const abs = (path: string, site: URL | undefined): string =>
  site ? new URL(path, site).href : path;

export function breadcrumbSchema(
  items: { label: string; href?: string }[],
  site: URL | undefined,
): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: abs(item.href, site) } : {}),
    })),
  };
}

export function clubSchema(
  club: Club,
  leagues: League[],
  site: URL | undefined,
): Schema {
  const schema: Schema = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: club.name,
    sport: "Soccer",
    url: abs(`/clubs/${club.slug}/`, site),
  };
  if (club.crest) schema.logo = abs(club.crest, site);
  if (club.founded !== null) schema.foundingDate = String(club.founded);
  if (club.country) {
    schema.location = { "@type": "Place", name: club.country };
  }
  if (leagues.length) {
    schema.memberOf = leagues.map((l) => ({
      "@type": "SportsOrganization",
      name: l.name,
      url: abs(`/leagues/${l.slug}/`, site),
    }));
  }
  return schema;
}

export function matchSchema(
  match: Match,
  home: Club,
  away: Club,
  league: League,
  site: URL | undefined,
): Schema {
  const team = (c: Club) => ({
    "@type": "SportsTeam",
    name: c.name,
    url: abs(`/clubs/${c.slug}/`, site),
  });
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${home.name} vs ${away.name}`,
    sport: "Soccer",
    ...(match.date ? { startDate: match.date } : {}),
    url: abs(`/matches/${match.id}`, site),
    homeTeam: team(home),
    awayTeam: team(away),
    competitor: [team(home), team(away)],
    superEvent: {
      "@type": "SportsOrganization",
      name: `${league.name} ${displaySeason(match.season)}`,
      url: abs(`/leagues/${league.slug}/${match.season}/`, site),
    },
  };
}

export function leagueSeasonSchema(
  league: League,
  season: string,
  standings: Standing[],
  site: URL | undefined,
): Schema[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "SportsOrganization",
      name: `${league.name} ${displaySeason(season)}`,
      sport: "Soccer",
      url: abs(`/leagues/${league.slug}/${season}/`, site),
      location: { "@type": "Place", name: league.country },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${league.name} ${displaySeason(season)} table`,
      numberOfItems: standings.length,
      itemListElement: standings.map((s) => ({
        "@type": "ListItem",
        position: s.position,
        name: s.club.name,
        url: abs(`/clubs/${s.club.slug}/`, site),
      })),
    },
  ];
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
