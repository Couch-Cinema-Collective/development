import { AWARD_TIER_ORDER, type AwardCategory } from "../types";

/**
 * The award catalog a commissioner toggles on and off, capped at 15 total
 * including custom additions (PLAN.md §4A).
 *
 * Order within a tier is announcement order; `ceremonyOrder` handles the tiers.
 */
/**
 * Catalog order is the awards-tab display order (design review): Best
 * Picture leads, then Director, the acting awards mirroring the Oscars,
 * Screenplay, Cinematography, Score, then the rest.
 */
export const AWARD_CATALOG: AwardCategory[] = [
  { id: "picture", name: "Best Picture", tier: "picture", locked: true },
  { id: "director", name: "Best Director", tier: "direction" },
  { id: "actor", name: "Best Actor", tier: "performance" },
  { id: "actress", name: "Best Actress", tier: "performance" },
  { id: "supporting-actor", name: "Best Supporting Actor", tier: "performance" },
  { id: "supporting-actress", name: "Best Supporting Actress", tier: "performance" },
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
  "picture",
  "director",
  "actor",
  "actress",
  "supporting-actor",
  "supporting-actress",
  "screenplay",
  "cinematography",
  "editing",
  "score",
];

/**
 * Sort awards into ceremony announcement order: craft first, Best Picture last,
 * custom awards slotted in ahead of the performance and directing categories.
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

export const SEASON_PRESETS = [
  {
    id: "standard",
    label: "Three months, six films",
    note: "Two films a month. The recommended shape.",
    months: 3,
    filmCount: 6,
  },
  {
    id: "intense",
    label: "Six weeks, five films",
    note: "Nearly a film a week. High engagement, short commitment.",
    months: 1.5,
    filmCount: 5,
  },
  {
    id: "marathon",
    label: "Four months, ten films",
    note: "A film every twelve days, for guilds going for it.",
    months: 4,
    filmCount: 10,
  },
];

/** No slate judges more than twelve films (design review). */
export const MAX_SEASON_FILMS = 12;
