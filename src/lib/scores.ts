import "server-only";

import type { ExternalScores } from "./types";

/**
 * External critic scores.
 *
 * OMDb was removed on 2026-08-19. It supplied IMDb, Rotten Tomatoes and
 * Metacritic scores but is licensed CC BY-NC — non-commercial only — and this
 * app now ships under a limited company. The licence was never going to
 * survive contact with a real entity, so it is gone rather than quietly
 * relied upon.
 *
 * The provider seam is kept deliberately: TMDB's own vote_average still feeds
 * the slate algorithm, and a properly-licensed source can be dropped in here
 * without touching a single call site.
 */
export interface ExternalScoreProvider {
  readonly name: string;
  readonly available: boolean;
  fetch(imdbId: string): Promise<ExternalScores | null>;
}

/** No external provider configured — TMDB ratings carry the critic term. */
export const nullProvider: ExternalScoreProvider = {
  name: "none",
  available: false,
  async fetch() {
    return null;
  },
};

export const scoreProvider: ExternalScoreProvider = nullProvider;

/**
 * Batch lookup, kept so call sites need no change if a provider returns.
 * Currently always resolves empty.
 */
export async function scoresFor(
  imdbIds: (string | null | undefined)[],
): Promise<Record<string, ExternalScores>> {
  if (!scoreProvider.available) return {};

  const entries = await Promise.all(
    imdbIds.map(async (id) => {
      if (!id) return null;
      const scores = await scoreProvider.fetch(id);
      return scores ? ([id, scores] as const) : null;
    }),
  );

  return Object.fromEntries(entries.filter((e) => e !== null));
}
