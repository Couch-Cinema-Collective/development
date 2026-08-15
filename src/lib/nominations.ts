import type { Film } from "./types";

/**
 * One film in the live nomination pool, as returned by the nomination_pool()
 * RPC: totals and a head-count, never who (PLAN.md §1.1 — hidden until lock).
 */
export interface PoolRow {
  tmdbId: number;
  film: Film;
  points: number;
  nominatorCount: number;
}

/** Raw RPC row shape (snake_case, film as stored jsonb). */
export interface PoolRpcRow {
  tmdb_id: number;
  film: Film;
  total_points: number;
  nominator_count: number;
}

export function toPoolRow(r: PoolRpcRow): PoolRow {
  return {
    tmdbId: r.tmdb_id,
    film: r.film,
    points: Number(r.total_points),
    nominatorCount: Number(r.nominator_count),
  };
}
