import type { Film, Nomination, SlateWeights } from "./types";

export const DEFAULT_WEIGHTS: SlateWeights = { guild: 0.8, critic: 0.2 };

export interface PoolEntry {
  film: Film;
  /** Summed nomination points across the guild. */
  points: number;
  /** Member ids. Concealed in the UI until the slate locks. */
  nominatorIds: string[];
  /** Weighted score used for ranking. */
  score: number;
}

/**
 * Aggregate raw nominations into the ranked pool (PLAN.md §1.2).
 *
 *   score = w_guild × normalized(points) + w_critic × normalized(critic)
 *
 * Both terms are normalized to 0–1 so the weights read as percentages.
 */
export function buildPool(
  nominations: Nomination[],
  films: Map<number, Film>,
  weights: SlateWeights = DEFAULT_WEIGHTS,
): PoolEntry[] {
  const byFilm = new Map<number, { points: number; nominatorIds: string[] }>();

  for (const nom of nominations) {
    if (nom.points <= 0) continue;
    const entry = byFilm.get(nom.filmId) ?? { points: 0, nominatorIds: [] };
    entry.points += nom.points;
    if (!entry.nominatorIds.includes(nom.memberId)) {
      entry.nominatorIds.push(nom.memberId);
    }
    byFilm.set(nom.filmId, entry);
  }

  const maxPoints = Math.max(1, ...[...byFilm.values()].map((e) => e.points));

  return [...byFilm.entries()]
    .flatMap(([filmId, entry]) => {
      const film = films.get(filmId);
      if (!film) return [];
      const guildTerm = entry.points / maxPoints;
      const criticTerm = film.voteAverage / 10;
      return [
        {
          film,
          points: entry.points,
          nominatorIds: entry.nominatorIds,
          score: weights.guild * guildTerm + weights.critic * criticTerm,
        },
      ];
    })
    .sort((a, b) => b.score - a.score || b.points - a.points);
}

/**
 * Cut the pool to the slate. A tie at the cutoff expands the slate rather than
 * dropping someone's pick on a technicality (PLAN.md §1.7), so the result can
 * legitimately be longer than `filmCount`.
 */
export function selectSlate(pool: PoolEntry[], filmCount: number): PoolEntry[] {
  if (pool.length <= filmCount) return pool;

  const cutoffScore = pool[filmCount - 1].score;
  return pool.filter(
    (entry, index) => index < filmCount || nearlyEqual(entry.score, cutoffScore),
  );
}

/** Scores are floats; treat a hair's difference as a genuine tie. */
function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}
