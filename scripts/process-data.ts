/**
 * Normalize raw OpenFootball data into the entity JSON the site consumes.
 *
 * For each configured league, discovers every available season in its cloned
 * repo, parses the football.txt format, links entities by deterministic slug,
 * and writes data/processed/{leagues,clubs,matches}.json.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cleanClubName, slugify } from "./lib/slugify.ts";
import { parseSeasonTxt } from "./lib/parse-openfootball.ts";
import { LEAGUES, discoverSeasons } from "./lib/sources.ts";
import type { Club, League, Match } from "../src/lib/types.ts";

const RAW_DIR = join(process.cwd(), "data", "raw", "openfootball");
const OUT_DIR = join(process.cwd(), "data", "processed");
const SPORTSDB_META = join(process.cwd(), "data", "sportsdb", "clubs.json");
const CREST_DIR = join(process.cwd(), "public", "images", "clubs");

interface ClubMeta {
  founded: number | null;
  stadium: string | null;
  location: string | null;
}

function loadClubMeta(): Record<string, ClubMeta> {
  if (!existsSync(SPORTSDB_META)) return {};
  return JSON.parse(readFileSync(SPORTSDB_META, "utf8")) as Record<
    string,
    ClubMeta
  >;
}

function main(): void {
  const clubMeta = loadClubMeta();
  const leagues = new Map<string, League>();
  const clubs = new Map<string, Club>();
  const matches: Match[] = [];
  const matchIds = new Set<string>();

  // Resolve a raw club name to a stable club id, creating the club on first
  // sight. Disambiguates the rare cross-country name clash by country.
  const registerClub = (
    rawName: string,
    country: string,
    leagueId: string,
  ): string => {
    const name = cleanClubName(rawName);
    const baseSlug = slugify(name);
    const existing = clubs.get(baseSlug);
    const slug =
      existing && existing.country !== country
        ? `${baseSlug}-${slugify(country)}`
        : baseSlug;

    const club = clubs.get(slug);
    if (club) {
      if (!club.league_ids.includes(leagueId)) club.league_ids.push(leagueId);
      return slug;
    }

    const meta = clubMeta[slug];
    const hasCrest = existsSync(join(CREST_DIR, `${slug}.png`));
    clubs.set(slug, {
      id: slug,
      slug,
      name,
      country,
      founded: meta?.founded ?? null,
      stadium: meta?.stadium ?? null,
      crest: hasCrest ? `/images/clubs/${slug}.png` : null,
      league_ids: [leagueId],
    });
    return slug;
  };

  for (const def of LEAGUES) {
    const repoDir = join(RAW_DIR, def.repo);
    const seasons = discoverSeasons(def, repoDir);
    if (seasons.length === 0) {
      console.warn(
        `! no seasons found for ${def.name} in ${repoDir} (run \`npm run fetch:all\`?)`,
      );
      continue;
    }

    const league: League = {
      id: def.leagueId,
      slug: def.leagueId,
      name: def.name,
      country: def.country,
      countrySlug: def.countrySlug,
      tier: def.tier,
      seasons: [],
    };
    leagues.set(def.leagueId, league);

    let leagueMatchCount = 0;
    for (const { season, path } of seasons) {
      const parsed = parseSeasonTxt(readFileSync(path, "utf8"), season);
      const resolvedSeason = parsed.season || season;
      if (!league.seasons.includes(resolvedSeason)) {
        league.seasons.push(resolvedSeason);
      }

      for (const m of parsed.matches) {
        const homeId = registerClub(m.home, def.country, def.leagueId);
        const awayId = registerClub(m.away, def.country, def.leagueId);

        let id = `${def.leagueId}-${resolvedSeason}-${homeId}-vs-${awayId}`;
        if (matchIds.has(id)) {
          let n = 2;
          while (matchIds.has(`${id}-${n}`)) n += 1;
          id = `${id}-${n}`;
        }
        matchIds.add(id);

        matches.push({
          id,
          date: m.date,
          time: m.time,
          round: m.round,
          home_club_id: homeId,
          away_club_id: awayId,
          score: { ht: m.ht, ft: m.ft },
          league_id: def.leagueId,
          season: resolvedSeason,
        });
        leagueMatchCount += 1;
      }
    }

    console.log(
      `· ${def.name}: ${seasons.length} seasons, ${leagueMatchCount} matches`,
    );
  }

  // Sort seasons newest-first for nicer rendering.
  for (const league of leagues.values()) {
    league.seasons.sort((a, b) => b.localeCompare(a));
  }

  const leaguesOut = [...leagues.values()].sort(
    (a, b) => a.tier - b.tier || a.name.localeCompare(b.name),
  );
  const clubsOut = [...clubs.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  mkdirSync(OUT_DIR, { recursive: true });
  const write = (name: string, data: unknown) =>
    writeFileSync(join(OUT_DIR, name), `${JSON.stringify(data, null, 2)}\n`);

  write("leagues.json", leaguesOut);
  write("clubs.json", clubsOut);
  write("matches.json", matches);

  console.log(
    `\nWrote ${leaguesOut.length} league(s), ${clubsOut.length} club(s), ${matches.length} match(es) to data/processed/`,
  );
}

main();
