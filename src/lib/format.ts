/**
 * Display formatting helpers (dates, scores, season labels).
 * Pure and timezone-safe: ISO date strings are treated as calendar dates.
 */
import type { Match } from "./types.ts";

const MONTHS_SHORT = [
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

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface DateOptions {
  weekday?: boolean;
  long?: boolean;
}

/** "2024-08-16" -> "16 Aug 2024" (or "Friday 16 August 2024" with options). */
export function formatDate(
  iso: string | null,
  options: DateOptions = {},
): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return "";
  const months = options.long ? MONTHS_LONG : MONTHS_SHORT;
  const base = `${d} ${months[m - 1]} ${y}`;
  if (!options.weekday) return base;
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${base}`;
}

/** Full-time score as "1-0", or a placeholder when not yet played. */
export function formatScore(match: Match): string {
  const ft = match.score.ft;
  return ft ? `${ft.home}-${ft.away}` : "–";
}

/** Half-time score as "(0-0)", or empty string when unavailable. */
export function formatHalfTime(match: Match): string {
  const ht = match.score.ht;
  return ht ? `(${ht.home}-${ht.away})` : "";
}

/** "2024-25" slug -> "2024/25" display label. */
export function displaySeason(slug: string): string {
  return slug.replace("-", "/");
}
