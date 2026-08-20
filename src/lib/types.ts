/** Domain model for Couch Cinema Collective. See PLAN.md §1–2. */

/** PLAN.md §2. The whole UI reads off this. */
export type SeasonState =
  | "DRAFT"
  | "NOMINATING"
  | "TALLYING"
  | "SLATE_LOCKED"
  | "WATCHING"
  | "VOTING"
  | "PUBLISHED"
  | "ARCHIVED";

/** Shaped to mirror TMDB's payload so the live client is a drop-in swap. */
export interface Film {
  id: number;
  title: string;
  year: number;
  /** TMDB poster path, or null — the UI renders a typographic card instead. */
  posterPath: string | null;
  director: string;
  runtime: number;
  /** TMDB vote_average, 0–10. The critic term in the slate algorithm. */
  voteAverage: number;
  overview: string;
  /** Cross-reference for any external score provider. */
  imdbId?: string | null;
  /** Populated by an external score provider, if one is configured. */
  externalScores?: ExternalScores;
}

/** Optional: no external provider is configured (see lib/scores.ts). */
export interface ExternalScores {
  imdb?: number;
  rottenTomatoes?: number;
  metacritic?: number;
}

export interface Member {
  id: string;
  name: string;
  /** Lifetime award credits, PLAN.md §1.3. */
  awards: AwardCredit[];
  seasonsPlayed: number;
}

/**
 * One award, credited to one member. Every nominator of a winning film gets a
 * full credit — no weighting by stake, no splitting (PLAN.md §1.3).
 */
export interface AwardCredit {
  awardId: string;
  awardName: string;
  filmTitle: string;
  seasonNumber: number;
}

/** A member's stake in one film. Members hold 5 points total per season. */
export interface Nomination {
  filmId: number;
  memberId: string;
  points: number;
}

export interface Guild {
  id: string;
  name: string;
  members: Member[];
  /** Hard cap, enforced at invite time (PLAN.md §1.6). */
  maxMembers: 50;
}

/**
 * Ceremony announcement order, lowest tier announced first. Follows the Oscars:
 * craft, then writing, then the guild's own custom awards, then performances,
 * direction, and Best Picture last.
 */
export type AwardTier =
  | "craft"
  | "writing"
  | "custom"
  | "performance"
  | "direction"
  | "picture";

export const AWARD_TIER_ORDER: AwardTier[] = [
  "craft",
  "writing",
  "custom",
  "performance",
  "direction",
  "picture",
];

export interface AwardCategory {
  id: string;
  name: string;
  tier: AwardTier;
  /** Best Picture cannot be switched off. */
  locked?: boolean;
}

export interface Season {
  id: string;
  number: number;
  guildId: string;
  /** e.g. "Animation", "Body Horror", "French New Wave" */
  category: string;
  state: SeasonState;
  /** Target slate size. Ties expand it (PLAN.md §1.7). */
  filmCount: number;
  nominationDeadline: string;
  awards: AwardCategory[];
  weights: SlateWeights;
}

/** The two commissioner sliders (PLAN.md §1.2). Must sum to 1. */
export interface SlateWeights {
  guild: number;
  critic: number;
}

/** A member's own write-up of a slate film, during the WATCHING phase. */
export interface Review {
  id: string;
  filmId: number;
  memberId: string;
  /** Out of 5, in half-steps. Separate from any external critic score. */
  rating: number;
  body: string;
  createdAt: string;
}

/** Marks a slate film as watched, which is what unlocks voting (§1.5). */
export interface WatchRecord {
  filmId: number;
  memberId: string;
}

/** One member's ballot: award id → the film they voted for. */
export type Ballot = Record<string, number>;

/** A billed performer, for the acting categories. */
export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

/**
 * Acting awards are won by a person rather than a film, so their ballot rows
 * carry a performer too. Ensemble is excluded — it belongs to the whole cast.
 */
export function needsPerformer(award: AwardCategory): boolean {
  return award.tier === "performance" && award.id !== "ensemble";
}

/** A decided award, once voting closes. */
export interface AwardResult {
  awardId: string;
  awardName: string;
  filmId: number;
  votes: number;
  totalVotes: number;
  /** Members who nominated the winning film — each earns a credit (§1.3). */
  nominatorIds: string[];
}

export const POINTS_PER_MEMBER = 5;
export const MAX_GUILD_MEMBERS = 50;
export const MAX_AWARD_CATEGORIES = 20;
