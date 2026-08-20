import {
  AWARD_TIER_ORDER,
  BEST_OF_THE_FEST,
  VOICE_OF_THE_PEOPLE,
  type AwardCategory,
  type ThemeFamily,
} from "../types";

/**
 * The awards a festival hands out.
 *
 * Only one of them counts. Best of the Fest decides the festival and goes on
 * the winning curator's record; everything else is honorary — real trophies,
 * no points. That split is the whole scoring system, so it is expressed here
 * as a single `scoring` flag rather than a tier of rules elsewhere.
 */
export const BEST_OF_THE_FEST_ID = "best-of-the-fest";
export const VOICE_OF_THE_PEOPLE_ID = "voice-of-the-people";

/** Locked on, and the only award that moves a curator's record. */
export const BEST_OF_THE_FEST_AWARD: AwardCategory = {
  id: BEST_OF_THE_FEST_ID,
  name: BEST_OF_THE_FEST,
  tier: "picture",
  locked: true,
  scoring: true,
};

/**
 * The critics' own award. Not on the ballot — it is counted from upvotes
 * earned across the festival, so it is listed here only so the ceremony has
 * a name and a slot to announce it in.
 */
export const VOICE_OF_THE_PEOPLE_AWARD: AwardCategory = {
  id: VOICE_OF_THE_PEOPLE_ID,
  name: VOICE_OF_THE_PEOPLE,
  tier: "critic",
};

/**
 * Honorary categories the president can switch on, capped at twelve.
 * Ordered as the awards tab displays them: the ones most guilds want first.
 */
export const AWARD_CATALOG: AwardCategory[] = [
  { id: "director", name: "Best Director", tier: "direction" },
  { id: "actor", name: "Best Lead Performance", tier: "performance" },
  { id: "supporting", name: "Best Supporting Performance", tier: "performance" },
  { id: "ensemble", name: "Best Ensemble", tier: "performance" },
  { id: "screenplay", name: "Best Screenplay", tier: "writing" },
  { id: "cinematography", name: "Best Cinematography", tier: "craft" },
  { id: "score", name: "Best Score", tier: "craft" },
  { id: "editing", name: "Best Editing", tier: "craft" },
  { id: "sound", name: "Best Sound", tier: "craft" },
  { id: "vfx", name: "Best Visual Effects", tier: "craft" },
  { id: "design", name: "Best Production Design", tier: "craft" },
  { id: "costume", name: "Best Costume Design", tier: "craft" },
  { id: "makeup", name: "Best Makeup & Hair", tier: "craft" },
];

/** Sensible starting set for a first-time president. */
export const DEFAULT_AWARD_IDS = [
  "director",
  "actor",
  "supporting",
  "screenplay",
  "cinematography",
  "score",
];

/**
 * Witty category names suggested from the festival's theme.
 *
 * The founding notes ask the app to propose award names that fit what the
 * guild is watching. These are starting points a president edits, not a
 * generated list they are stuck with.
 */
export const AWARD_SUGGESTIONS: Record<ThemeFamily, string[]> = {
  nations: [
    "Best Use of a Landscape",
    "The Subtitle Award",
    "Most Convincing Sense of Place",
  ],
  filmmakers: [
    "Most Characteristic Shot",
    "The Obsession Award",
    "Best Recurring Collaborator",
  ],
  genres: [
    "Best Use of the Formula",
    "Most Effective Cheap Trick",
    "The Genre-Breaking Award",
  ],
  movements: [
    "Most Manifesto-Compliant",
    "Best Break With Tradition",
    "The Influence Award",
  ],
  eras: [
    "Most of Its Moment",
    "Best Aged",
    "The Time Capsule Award",
  ],
  custom: [
    "Best Needle Drop",
    "Most Rewatchable",
    "The Hardest to Sit Through",
  ],
};

/**
 * Sort awards into ceremony announcement order: craft first, Best of the Fest
 * second to last, and the critics' award closing the night.
 */
export function ceremonyOrder(awards: AwardCategory[]): AwardCategory[] {
  return [...awards].sort((a, b) => {
    const tierDelta =
      AWARD_TIER_ORDER.indexOf(a.tier) - AWARD_TIER_ORDER.indexOf(b.tier);
    if (tierDelta !== 0) return tierDelta;

    // Within a tier, fall back to catalog order so the sort stays deterministic.
    const catalogIndex = (award: AwardCategory) =>
      AWARD_CATALOG.findIndex((c) => c.id === award.id);
    return catalogIndex(a) - catalogIndex(b);
  });
}

/**
 * Cadence presets. The founding notes settle on a fortnight per film — two
 * weekends to watch, then a couple of days to write, then a day to vote — and
 * the alternatives just tighten or loosen that.
 */
export const CADENCE_PRESETS = [
  {
    id: "standard",
    label: "A fortnight a film",
    note: "Two weekends to watch, two days to review, a day to vote. The recommended shape.",
    viewingDays: 14,
    reviewDays: 2,
    votingHours: 24,
  },
  {
    id: "brisk",
    label: "A week a film",
    note: "One weekend per film. Short festivals, high tempo.",
    viewingDays: 7,
    reviewDays: 2,
    votingHours: 24,
  },
  {
    id: "unhurried",
    label: "A month a film",
    note: "For guilds with jobs. Long runway, same rhythm.",
    viewingDays: 28,
    reviewDays: 3,
    votingHours: 48,
  },
];
