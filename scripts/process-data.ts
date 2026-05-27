/**
 * Normalize raw OpenFootball data into the entity JSON the site consumes.
 *
 * Reads data/raw/openfootball/<repo>/<file> for each configured source,
 * parses the football.txt format, links entities by deterministic slug, and
 * writes data/processed/{leagues,clubs,matches}.json.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cleanClubName, slugify } from "./lib/slugify.ts";
import { parseSeasonTxt } from "./lib/parse-openfootball.ts";
import { SOURCES } from "./lib/sources.ts";
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

function loadSourceText(repo: string, file: string): string {
  const path = join(RAW_DIR, repo, file);
  if (!existsSync(path)) {
    throw new Error(
      `Missing raw data: ${path}\nRun \`npm run fetch:all\` first.`,
    );
  }
  return readFileSync(path, "utf8");
}

function main(): void {
  const clubMeta = loadClubMeta();
  const leagues = new Map<string, League>();
  const clubs = new Map<string, Club>();
  const matches: Match[] = [];
  const matchIds = new Set<string>();

  for (const source of SOURCES) {
    const text = loadSourceText(source.repo, source.file);
    const parsed = parseSeasonTxt(text, source.season);
    const season = parsed.season || source.season;

    // League (dedupe by id, accumulate seasons).
    const league = leagues.get(source.leagueId) ?? {
      id: source.leagueId,
      slug: source.leagueId,
      name: source.name,
      country: source.country,
      countrySlug: source.countrySlug,
      tier: source.tier,
      seasons: [],
    };
    if (!league.seasons.includes(season)) league.seasons.push(season);
    leagues.set(source.leagueId, league);

    const registerClub = (rawName: string): string => {
      const name = cleanClubName(rawName);
      const slug = slugify(name);
      const existing = clubs.get(slug);
      if (existing) {
        if (!existing.league_ids.includes(source.leagueId)) {
          existing.league_ids.push(source.leagueId);
        }
        return slug;
      }
      const meta = clubMeta[slug];
      const hasCrest = existsSync(join(CREST_DIR, `${slug}.png`));
      clubs.set(slug, {
        id: slug,
        slug,
        name,
        country: source.country,
        founded: meta?.founded ?? null,
        stadium: meta?.stadium ?? null,
        crest: hasCrest ? `/images/clubs/${slug}.png` : null,
        league_ids: [source.leagueId],
      });
      return slug;
    };

    for (const m of parsed.matches) {
      const homeId = registerClub(m.home);
      const awayId = registerClub(m.away);

      let id = `${source.leagueId}-${season}-${homeId}-vs-${awayId}`;
      // Guard against duplicate fixtures (e.g. cup replays); keep deterministic.
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
        league_id: source.leagueId,
        season,
      });
    }

    console.log(
      `· ${source.name} ${season}: ${parsed.matches.length} matches`,
    );
  }

  // Sort seasons newest-first for nicer rendering.
  for (const league of leagues.values()) {
    league.seasons.sort((a, b) => b.localeCompare(a));
  }

  const leaguesOut = [...leagues.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
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
