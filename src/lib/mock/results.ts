import type { AwardResult } from "../types";
import { ceremonyOrder } from "./awards";
import { CUSTOM_AWARDS, SEASON, nominatorsOf } from "./guild";

/**
 * Decided results for the Season 3 ceremony.
 *
 * Sweeps are permitted (PLAN.md §1.4) — Spirited Away takes three here,
 * including Best Picture, which is exactly the kind of night the rules allow.
 */
const WINNERS: Record<string, { filmId: number; votes: number }> = {
  score: { filmId: 129, votes: 4 },
  editing: { filmId: 149, votes: 5 },
  cinematography: { filmId: 128, votes: 3 },
  screenplay: { filmId: 12477, votes: 4 },
  "custom-voiceover": { filmId: 149, votes: 6 },
  supporting: { filmId: 10494, votes: 3 },
  "lead-actor": { filmId: 12477, votes: 5 },
  director: { filmId: 129, votes: 4 },
  picture: { filmId: 129, votes: 5 },
};

const TOTAL_VOTES = 7;

/** Announcement order: craft, writing, custom, performance, direction, picture. */
export const CEREMONY_AWARDS = ceremonyOrder([
  ...SEASON.awards.filter((a) => !CUSTOM_AWARDS.some((c) => c.id === a.id)),
  ...CUSTOM_AWARDS,
]);

export const RESULTS: AwardResult[] = CEREMONY_AWARDS.flatMap((award) => {
  const winner = WINNERS[award.id];
  if (!winner) return [];

  return [
    {
      awardId: award.id,
      awardName: award.name,
      filmId: winner.filmId,
      votes: winner.votes,
      totalVotes: TOTAL_VOTES,
      nominatorIds: nominatorsOf(winner.filmId),
    },
  ];
});

/**
 * How many of tonight's awards each member can claim, by virtue of having
 * nominated the winning film. A count, not a score (PLAN.md §1.3).
 */
export function nominatorTally(results: AwardResult[]): {
  memberId: string;
  count: number;
}[] {
  const counts = new Map<string, number>();
  for (const result of results) {
    for (const memberId of result.nominatorIds) {
      counts.set(memberId, (counts.get(memberId) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([memberId, count]) => ({ memberId, count }))
    .sort((a, b) => b.count - a.count);
}
