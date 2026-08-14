import { AWARD_TIER_ORDER, type AwardCategory } from "../types";

/**
 * The award catalog a commissioner toggles on and off, capped at 15 total
 * including custom additions (PLAN.md §4A).
 *
 * Order within a tier is announcement order; `ceremonyOrder` handles the tiers.
 */
export const AWARD_CATALOG: AwardCategory[] = [
  { id: "makeup", name: "Best Makeup & Hair", tier: "craft" },
  { id: "costume", name: "Best Costume Design", tier: "craft" },
  { id: "design", name: "Best Production Design", tier: "craft" },
  { id: "vfx", name: "Best Visual Effects", tier: "craft" },
  { id: "sound", name: "Best Sound", tier: "craft" },
  { id: "score", name: "Best Score", tier: "craft" },
  { id: "editing", name: "Best Editing", tier: "craft" },
  { id: "cinematography", name: "Best Cinematography", tier: "craft" },
  { id: "adapted", name: "Best Adapted Screenplay", tier: "writing" },
  { id: "screenplay", name: "Best Original Screenplay", tier: "writing" },
  { id: "ensemble", name: "Best Ensemble", tier: "performance" },
  { id: "supporting", name: "Best Supporting Performance", tier: "performance" },
  { id: "lead-actor", name: "Best Lead Performance", tier: "performance" },
  { id: "director", name: "Best Director", tier: "direction" },
  { id: "picture", name: "Best Picture", tier: "picture", locked: true },
];

/** Sensible starting set for a first-time commissioner. */
export const DEFAULT_AWARD_IDS = [
  "picture",
  "director",
  "lead-actor",
  "supporting",
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
    id: "year",
    label: "One year, twelve films",
    note: "A film a month. Slow burn, big finale.",
    months: 12,
    filmCount: 12,
  },
  {
    id: "sprint",
    label: "Six weeks, three films",
    note: "A film a fortnight. High engagement, short commitment.",
    months: 1.5,
    filmCount: 3,
  },
];
