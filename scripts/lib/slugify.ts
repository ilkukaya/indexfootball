/**
 * Deterministic, URL-safe slug generation.
 *
 * Used for every entity id/slug so the same input always maps to the same
 * output across builds (stable URLs are critical for SEO).
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "") // strip diacritics (é -> e)
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "") // drop apostrophes and dots
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalize an OpenFootball club name for display.
 * Drops a trailing " FC" (e.g. "Manchester United FC" -> "Manchester United")
 * while leaving meaningful prefixes like "AFC Bournemouth" intact.
 */
export function cleanClubName(raw: string): string {
  return raw.replace(/\s+FC$/u, "").trim();
}
