import "server-only";

import type { ExternalScores } from "./types";

/**
 * External critic scores (PLAN.md §3.2).
 *
 * Deliberately behind a provider interface. OMDb is licensed CC BY-NC, so the
 * day Couch Cinema Collective charges anyone it has to come out — swapping the
 * export below for `nullProvider` is the whole removal, and `w_critic` falls
 * back to TMDB's own rating with no other code touched.
 */
export interface ExternalScoreProvider {
  readonly name: string;
  readonly available: boolean;
  fetch(imdbId: string): Promise<ExternalScores | null>;
}

interface OmdbResponse {
  Response: "True" | "False";
  Error?: string;
  Ratings?: { Source: string; Value: string }[];
  imdbRating?: string;
  Metascore?: string;
}

/** "96%" → 96, "8.6/10" → 8.6, "96/100" → 96. */
function parseScore(value: string): number | undefined {
  const numeric = Number.parseFloat(value.replace("%", ""));
  return Number.isFinite(numeric) ? numeric : undefined;
}

const omdbProvider: ExternalScoreProvider = {
  name: "OMDb",
  get available() {
    return Boolean(process.env.OMDB_API_KEY);
  },

  async fetch(imdbId) {
    const key = process.env.OMDB_API_KEY;
    if (!key || !imdbId) return null;

    const url = new URL("https://www.omdbapi.com/");
    url.searchParams.set("i", imdbId);
    url.searchParams.set("apikey", key);

    try {
      // Only called at slate lock and on the season page, so the 1,000/day
      // free tier is never close to a constraint.
      const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
      if (!res.ok) return null;

      const data = (await res.json()) as OmdbResponse;
      if (data.Response !== "True") return null;

      const scores: ExternalScores = {};

      const rt = data.Ratings?.find((r) => r.Source === "Rotten Tomatoes");
      if (rt) scores.rottenTomatoes = parseScore(rt.Value);

      if (data.imdbRating && data.imdbRating !== "N/A") {
        scores.imdb = parseScore(data.imdbRating);
      }
      if (data.Metascore && data.Metascore !== "N/A") {
        scores.metacritic = parseScore(data.Metascore);
      }

      return Object.keys(scores).length > 0 ? scores : null;
    } catch {
      return null;
    }
  },
};

/** Drop-in replacement if OMDb ever has to be removed for licensing. */
export const nullProvider: ExternalScoreProvider = {
  name: "none",
  available: false,
  async fetch() {
    return null;
  },
};

export const scoreProvider: ExternalScoreProvider = omdbProvider;

/** Batch lookup. One failure never blanks the others. */
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
