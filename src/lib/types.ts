/**
 * Normalized entity shapes shared by the build-time data pipeline
 * (scripts/) and the site (src/).
 */

export interface League {
  id: string;
  slug: string;
  name: string;
  country: string;
  countrySlug: string;
  tier: number;
  seasons: string[];
}

export interface Club {
  id: string;
  slug: string;
  name: string;
  country: string;
  founded: number | null;
  /** Home stadium, when known (from TheSportsDB enrichment). */
  stadium: string | null;
  /** Public path to a cached crest image, or null to use the initials badge. */
  crest: string | null;
  league_ids: string[];
}

export interface ScoreLine {
  home: number;
  away: number;
}

export interface MatchScore {
  ht: ScoreLine | null;
  ft: ScoreLine | null;
}

export interface Match {
  id: string;
  date: string | null;
  time: string | null;
  round: number | null;
  home_club_id: string;
  away_club_id: string;
  score: MatchScore;
  league_id: string;
  season: string;
}

/** A computed standings row (club embedded for convenient rendering). */
export interface Standing {
  position: number;
  club: Club;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  /** Most recent results first, each "W" | "D" | "L". */
  form: ("W" | "D" | "L")[];
}
