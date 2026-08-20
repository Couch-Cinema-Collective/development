/** Domain model for Couch Cinema Collective. See PLAN.md §1–2. */

/**
 * A festival's overall arc. Screening is the long middle: it repeats the
 * per-film cycle once for every nominated film before awards open.
 */
export type FestivalState =
  | "DRAFT"
  | "RECRUITING"
  | "NOMINATING"
  | "LINEUP_SET"
  | "SCREENING"
  | "AWARDS_VOTING"
  | "CEREMONY"
  | "ARCHIVED";

/**
 * Where a single film sits in its own cycle. Every film in the lineup walks
 * this path in turn — viewing, then reviewing, then the critics' window.
 */
export type ScreeningPhase =
  | "UPCOMING"
  | "VIEWING"
  | "REVIEWING"
  | "CRITICS_VOTING"
  | "CLOSED";

/** Shaped to mirror TMDB's payload so the live client is a drop-in swap. */
export interface Film {
  id: number;
  title: string;
  year: number;
  /** TMDB poster path, or null — the UI renders a typographic card instead. */
  posterPath: string | null;
  director: string;
  runtime: number;
  /** TMDB vote_average, 0–10. Shown for context; it decides nothing. */
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

/**
 * The two ways to belong to a guild.
 *
 * Curators nominate films and compete for the festival award; critics are the
 * voting body. Every curator is also a critic — curating is an addition to the
 * critic's job, never a replacement for it. The president is the curator who
 * founded the guild and runs its festivals.
 *
 * Both seats are open on arrival. Curator seats are simply finite: the
 * president sets how many exist, and they go first-come-first-served.
 */
export type GuildRole = "president" | "curator" | "critic";

export interface Member {
  id: string;
  name: string;
  role: GuildRole;
  /** Festival awards won by films this member nominated. */
  awards: AwardCredit[];
  festivalsPlayed: number;
}

/** Curators are the voting body too, so every role can write reviews. */
export function isCurator(role: GuildRole): boolean {
  return role === "president" || role === "curator";
}

/**
 * One award, credited to the curator who nominated the winning film.
 * Only Best of the Fest moves a curator's record; the rest are honorary.
 */
export interface AwardCredit {
  awardId: string;
  awardName: string;
  filmTitle: string;
  festivalNumber: number;
  /** False for the honorary categories — they decorate, they don't score. */
  scoring: boolean;
}

/** A curator's single pick for a festival. One film, one curator, no stakes. */
export interface Nomination {
  filmId: number;
  memberId: string;
}

export interface Guild {
  id: string;
  name: string;
  members: Member[];
  /** 4–12 curators, the president included (they cap the lineup size). */
  maxCurators: number;
  /** The voting body beyond the curators. */
  maxCritics: number;
}

/**
 * Ceremony announcement order, lowest tier announced first. Honorary awards
 * come first, then the two that actually settle the festival: Best of the
 * Fest, then the critics' own award.
 */
export type AwardTier =
  | "craft"
  | "writing"
  | "custom"
  | "performance"
  | "direction"
  | "picture"
  | "critic";

export const AWARD_TIER_ORDER: AwardTier[] = [
  "craft",
  "writing",
  "custom",
  "performance",
  "direction",
  "picture",
  "critic",
];

export interface AwardCategory {
  id: string;
  name: string;
  tier: AwardTier;
  /** Best of the Fest cannot be switched off. */
  locked?: boolean;
  /** Only Best of the Fest counts toward a curator's record. */
  scoring?: boolean;
}

/** What a festival is about. The president picks one family, then names it. */
export type ThemeFamily =
  | "nations"
  | "filmmakers"
  | "genres"
  | "movements"
  | "eras"
  | "custom";

export const THEME_FAMILIES: {
  id: ThemeFamily;
  label: string;
  example: string;
}[] = [
  { id: "nations", label: "Nations", example: "South Korean cinema" },
  { id: "filmmakers", label: "Filmmakers", example: "Agnès Varda" },
  { id: "genres", label: "Genres", example: "Body horror" },
  { id: "movements", label: "Film movements", example: "French New Wave" },
  { id: "eras", label: "Eras", example: "New Hollywood, 1967–1980" },
  { id: "custom", label: "Custom", example: "Christmas movies" },
];

/**
 * Open festivals recruit strangers up to the curator cap; closed ones are
 * invite-only by code.
 */
export type Visibility = "open" | "closed";

/**
 * How long each film's cycle runs. Defaults give roughly two weekends to
 * watch, then a couple of days to write, then a day to vote.
 */
export interface Cadence {
  viewingDays: number;
  reviewDays: number;
  votingHours: number;
}

export const DEFAULT_CADENCE: Cadence = {
  viewingDays: 14,
  reviewDays: 2,
  votingHours: 24,
};

export interface Festival {
  id: string;
  number: number;
  guildId: string;
  /** e.g. "Animation", "Body Horror", "French New Wave" */
  theme: string;
  themeFamily: ThemeFamily;
  state: FestivalState;
  visibility: Visibility;
  /** One film per curator, so this follows the roster rather than a setting. */
  filmCount: number;
  nominationDeadline: string | null;
  /** When the first film's viewing period opens. */
  screeningStartsAt: string | null;
  cadence: Cadence;
  awards: AwardCategory[];
}

/** One film in the lineup, with the clock its cycle runs on. */
export interface LineupFilm {
  film: Film;
  /** Screening order, 1-based. */
  position: number;
  /** The curator who put it up. Revealed when the lineup is set. */
  curatorId: string | null;
  viewingStartsAt: string;
  reviewStartsAt: string;
  votingStartsAt: string;
  closesAt: string;
}

/** A critic's write-up. Anonymous until its voting window shuts. */
export interface Review {
  id: string;
  filmId: number;
  memberId: string;
  body: string;
  createdAt: string;
  /** Late write-ups are welcome, but they cannot be voted on. */
  eligible: boolean;
}

/** Marks a lineup film as watched. */
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
  scoring: boolean;
  /** The curator who nominated the winning film. */
  curatorId: string | null;
}

/** The critics' own award: most upvoted reviewer across the whole festival. */
export interface CriticStanding {
  memberId: string;
  upvotes: number;
  reviewsWritten: number;
}

// ── The rules, as constants ──────────────────────────────────────────────────

/**
 * A festival needs four curators to be worth running, and tops out at twelve.
 * The president picks a number in this range; seats are then first-come.
 */
export const MIN_CURATORS = 4;
export const MAX_CURATORS = 12;

/** The voting body, on top of the curators. */
export const MAX_CRITICS = 50;

/** Reviews are a paragraph, not an essay — brevity is the format. */
export const REVIEW_MAX_CHARS = 200;

/**
 * Upvotes each critic spends per film. Spend fewer and your own review stops
 * being eligible to receive them — participation is the price of competing.
 */
export const UPVOTES_PER_FILM = 3;

/** Honorary categories the president may add on top of Best of the Fest. */
export const MAX_CUSTOM_AWARDS = 12;

/** The award that settles the festival, and the one the critics play for. */
export const BEST_OF_THE_FEST = "Best of the Fest";
export const VOICE_OF_THE_PEOPLE = "Voice of the People";
