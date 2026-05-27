/**
 * Compute a league table from raw match data.
 *
 * Pure function: given the matches and clubs for one league+season, returns a
 * sorted Standing[] with P/W/D/L/GF/GA/GD/Pts and recent form. Only matches
 * with a full-time score are counted (fixtures without results are ignored).
 */
import type { Club, Match, Standing } from "./types.ts";

interface Row {
  club: Club;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
  // Result history with dates, used to derive recent form after sorting.
  history: { date: string | null; result: "W" | "D" | "L" }[];
}

export function computeStandings(matches: Match[], clubs: Club[]): Standing[] {
  const rows = new Map<string, Row>();
  for (const club of clubs) {
    rows.set(club.id, {
      club,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      points: 0,
      history: [],
    });
  }

  for (const match of matches) {
    const ft = match.score.ft;
    if (!ft) continue; // not yet played

    const home = rows.get(match.home_club_id);
    const away = rows.get(match.away_club_id);
    if (!home || !away) continue; // club outside this club set

    home.played += 1;
    away.played += 1;
    home.gf += ft.home;
    home.ga += ft.away;
    away.gf += ft.away;
    away.ga += ft.home;

    if (ft.home > ft.away) {
      home.won += 1;
      home.points += 3;
      home.history.push({ date: match.date, result: "W" });
      away.lost += 1;
      away.history.push({ date: match.date, result: "L" });
    } else if (ft.home < ft.away) {
      away.won += 1;
      away.points += 3;
      away.history.push({ date: match.date, result: "W" });
      home.lost += 1;
      home.history.push({ date: match.date, result: "L" });
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
      home.history.push({ date: match.date, result: "D" });
      away.history.push({ date: match.date, result: "D" });
    }
  }

  const standings: Standing[] = [...rows.values()].map((row) => {
    const form = [...row.history]
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
      .slice(-5)
      .reverse()
      .map((h) => h.result);

    return {
      position: 0,
      club: row.club,
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      gf: row.gf,
      ga: row.ga,
      gd: row.gf - row.ga,
      points: row.points,
      form,
    };
  });

  standings.sort(
    (a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.club.name.localeCompare(b.club.name),
  );

  standings.forEach((s, i) => {
    s.position = i + 1;
  });

  return standings;
}
