/**
 * Parser for the OpenFootball "football.txt" plain-text format used by the
 * country repos (e.g. openfootball/england -> 2024-25/1-premierleague.txt).
 *
 * Example structure:
 *
 *   = English Premier League 2024/25
 *   # Teams 20
 *
 *   ▪ Matchday 1
 *     Fri Aug 16 2024
 *       20:00  Manchester United FC    v Fulham FC    1-0 (0-0)
 *     Sat Aug 17
 *       15:00  Arsenal FC              v Wolves FC    2-0 (1-0)
 *              Everton FC              v Brighton FC  0-3 (0-1)   (inherits 15:00)
 */

export interface ParsedScore {
  home: number;
  away: number;
}

export interface ParsedMatch {
  round: number | null;
  date: string | null; // ISO yyyy-mm-dd
  time: string | null; // HH:MM kickoff
  home: string; // raw club name as written in the source
  away: string;
  ft: ParsedScore | null;
  ht: ParsedScore | null;
}

export interface ParsedSeason {
  leagueTitle: string; // e.g. "English Premier League"
  season: string; // normalized "2024-25"
  matches: ParsedMatch[];
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Dates appear as "Fri Aug 16 2024" (england) or "Fri Aug/16 2024" (others);
// kickoff times as "20:00" or "20.45". Regexes accept both conventions.
const TITLE_RE = /^=\s+(.+?)\s+(\d{4})\/(\d{2})\s*$/;
const ROUND_RE =
  /^[▪»>•\-\s]*(?:Matchday|Round|Week|Spieltag|Jornada|Giornata)\s+(\d+)/i;
// Dates may be bare ("Fri Aug 16 2024") or bracketed ("[Fri Aug/13]").
const DATE_RE =
  /^\[?(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})[\s/](\d{1,2})(?:\s+(\d{4}))?\]?$/;
// New layout (recent seasons): "Home v Away  FT (HT)" — score at the end.
const MATCH_RE =
  /^(?:(\d{1,2}[:.]\d{2})\s+)?(.+?)\s+v\s+(.+?)\s+(\d+)-(\d+)(?:\s*\((\d+)-(\d+)\))?\s*$/;
const FIXTURE_RE = /^(?:(\d{1,2}[:.]\d{2})\s+)?(.+?)\s+v\s+(.+?)\s*$/;
// Old layout (historical seasons): "Home  FT (HT)  Away" — score in the middle,
// no "v" separator. Tried only after the new layout fails to match.
const OLD_MATCH_RE =
  /^(?:(\d{1,2}[:.]\d{2})\s+)?(.+?)\s+(\d+)-(\d+)(?:\s*\((\d+)-(\d+)\))?\s+(.+?)\s*$/;

const normalizeTime = (t: string): string => t.replace(".", ":");

const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

/** "2024/25" header -> "2024-25" season slug. */
function normalizeSeason(startYear: number): string {
  const end = (startYear + 1) % 100;
  return `${startYear}-${pad(end)}`;
}

export function parseSeasonTxt(
  text: string,
  fallbackSeason?: string,
): ParsedSeason {
  const lines = text.split(/\r?\n/);

  let leagueTitle = "";
  let season = fallbackSeason ?? "";
  let seasonStartYear = fallbackSeason
    ? parseInt(fallbackSeason.slice(0, 4), 10)
    : NaN;

  let currentRound: number | null = null;
  let currentDate: string | null = null;
  let currentTime: string | null = null;
  let currentYear: number | null = null;
  let prevMonthIdx: number | null = null;

  const matches: ParsedMatch[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") continue;

    const title = TITLE_RE.exec(line);
    if (title) {
      leagueTitle = title[1].trim();
      seasonStartYear = parseInt(title[2], 10);
      season = normalizeSeason(seasonStartYear);
      continue;
    }

    if (line.startsWith("#")) continue; // metadata comment

    const round = ROUND_RE.exec(line);
    if (round) {
      currentRound = parseInt(round[1], 10);
      currentDate = null;
      currentTime = null;
      continue;
    }

    const date = DATE_RE.exec(line);
    if (date) {
      const monthIdx = MONTHS.indexOf(date[1]);
      if (monthIdx === -1) continue;
      const day = parseInt(date[2], 10);
      const explicitYear = date[3] ? parseInt(date[3], 10) : null;

      if (explicitYear !== null) {
        currentYear = explicitYear;
      } else if (currentYear === null) {
        // First date without an explicit year: infer from the season.
        // European seasons run Aug->May, so Jul+ belongs to the start year.
        currentYear =
          monthIdx >= 6 ? seasonStartYear : seasonStartYear + 1;
      } else if (prevMonthIdx !== null && monthIdx < prevMonthIdx) {
        currentYear += 1; // rolled past December into the new calendar year
      }

      prevMonthIdx = monthIdx;
      currentTime = null;
      currentDate = Number.isNaN(currentYear)
        ? null
        : `${currentYear}-${pad(monthIdx + 1)}-${pad(day)}`;
      continue;
    }

    // Strip inline annotations like "[awarded]" / "[abandoned]" before parsing
    // a result line (date lines were already handled above and keep brackets).
    const line2 = line.replace(/\s*\[[^\]]*\]\s*/g, " ").trim();

    const match = MATCH_RE.exec(line2);
    if (match) {
      const [, time, home, away, fh, fa, hh, ha] = match;
      if (time) currentTime = normalizeTime(time);
      matches.push({
        round: currentRound,
        date: currentDate,
        time: currentTime,
        home: home.trim(),
        away: away.trim(),
        ft: { home: parseInt(fh, 10), away: parseInt(fa, 10) },
        ht:
          hh !== undefined && ha !== undefined
            ? { home: parseInt(hh, 10), away: parseInt(ha, 10) }
            : null,
      });
      continue;
    }

    const oldMatch = OLD_MATCH_RE.exec(line2);
    if (oldMatch) {
      const [, time, home, fh, fa, hh, ha, away] = oldMatch;
      if (time) currentTime = normalizeTime(time);
      matches.push({
        round: currentRound,
        date: currentDate,
        time: currentTime,
        home: home.trim(),
        away: away.trim(),
        ft: { home: parseInt(fh, 10), away: parseInt(fa, 10) },
        ht:
          hh !== undefined && ha !== undefined
            ? { home: parseInt(hh, 10), away: parseInt(ha, 10) }
            : null,
      });
      continue;
    }

    const fixture = FIXTURE_RE.exec(line2);
    if (fixture) {
      const [, time, home, away] = fixture;
      if (time) currentTime = normalizeTime(time);
      matches.push({
        round: currentRound,
        date: currentDate,
        time: currentTime,
        home: home.trim(),
        away: away.trim(),
        ft: null,
        ht: null,
      });
    }
  }

  return { leagueTitle, season, matches };
}
