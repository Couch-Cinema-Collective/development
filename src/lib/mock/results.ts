import type { AwardResult } from "../types";
import { ceremonyOrder } from "./awards";
import { CUSTOM_AWARDS, FESTIVAL, curatorOf } from "./guild";

/**
 * Decided results for the Festival 3 ceremony.
 *
 * Sweeps are permitted — Spirited Away takes three here, Best of the Fest
 * included, which is exactly the kind of night the rules allow. Only that one
 * moves its curator's record; the rest are honorary.
 */
const WINNERS: Record<string, { filmId: number; votes: number }> = {
  score: { filmId: 129, votes: 4 },
  editing: { filmId: 149, votes: 5 },
  cinematography: { filmId: 128, votes: 3 },
  screenplay: { filmId: 12477, votes: 4 },
  "custom-voiceover": { filmId: 149, votes: 6 },
  supporting: { filmId: 10494, votes: 3 },
  actor: { filmId: 12477, votes: 5 },
  director: { filmId: 129, votes: 4 },
  "best-of-the-fest": { filmId: 129, votes: 5 },
};

const TOTAL_VOTES = 8;

/** Announcement order: honorary first, Best of the Fest last. */
export const CEREMONY_AWARDS = ceremonyOrder([
  ...FESTIVAL.awards.filter((a) => !CUSTOM_AWARDS.some((c) => c.id === a.id)),
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
      scoring: award.scoring ?? false,
      curatorId: curatorOf(winner.filmId),
    },
  ];
});

/**
 * How many of tonight's awards each curator can claim, by virtue of having
 * put the winning film up. A count, not a score — and only the Best of the
 * Fest line actually decides anything.
 */
export function curatorTally(results: AwardResult[]): {
  memberId: string;
  count: number;
  wonBestOfTheFest: boolean;
}[] {
  const counts = new Map<string, { count: number; best: boolean }>();
  for (const result of results) {
    if (!result.curatorId) continue;
    const entry = counts.get(result.curatorId) ?? { count: 0, best: false };
    entry.count += 1;
    if (result.scoring) entry.best = true;
    counts.set(result.curatorId, entry);
  }

  return [...counts.entries()]
    .map(([memberId, e]) => ({
      memberId,
      count: e.count,
      wonBestOfTheFest: e.best,
    }))
    // The festival winner leads the tally regardless of how many they took.
    .sort(
      (a, b) =>
        Number(b.wonBestOfTheFest) - Number(a.wonBestOfTheFest) ||
        b.count - a.count,
    );
}
