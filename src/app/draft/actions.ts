"use server";

import { toPoolRow, type PoolRow, type PoolRpcRow } from "@/lib/nominations";
import { createClient } from "@/lib/supabase/server";
import type { Film } from "@/lib/types";

export interface SaveStakeResult {
  error?: string;
  /** Fresh pool after the write, so the UI stays in step. */
  pool?: PoolRow[];
}

/**
 * Persist one film's stake for the signed-in member: points > 0 upserts,
 * points = 0 withdraws. The database owns the rules — membership, the
 * NOMINATING window, and the 5-point budget (a constraint trigger) — so this
 * action just relays and translates errors.
 */
export async function saveStake(input: {
  seasonId: string;
  film: Film;
  points: number;
}): Promise<SaveStakeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to nominate." };

  const points = Math.floor(input.points);
  if (points < 0 || points > 5) return { error: "Stakes run 0–5 points." };

  if (points === 0) {
    const { error } = await supabase
      .from("nominations")
      .delete()
      .eq("season_id", input.seasonId)
      .eq("user_id", user.id)
      .eq("tmdb_id", input.film.id);
    if (error) return { error: friendly(error.message) };
  } else {
    const { error } = await supabase.from("nominations").upsert(
      {
        season_id: input.seasonId,
        user_id: user.id,
        tmdb_id: input.film.id,
        points,
        // Snapshot for pool/slate rendering without a TMDB round-trip.
        film: {
          id: input.film.id,
          title: input.film.title,
          year: input.film.year,
          posterPath: input.film.posterPath,
          director: input.film.director,
          runtime: input.film.runtime,
          voteAverage: input.film.voteAverage,
          overview: input.film.overview,
          imdbId: input.film.imdbId ?? null,
        },
      },
      { onConflict: "season_id,user_id,tmdb_id" },
    );
    if (error) return { error: friendly(error.message) };
  }

  const { data: poolRows, error: poolError } = await supabase.rpc(
    "nomination_pool",
    { sid: input.seasonId },
  );
  if (poolError) return { error: friendly(poolError.message) };

  return { pool: (poolRows as PoolRpcRow[]).map(toPoolRow) };
}

/** DB errors worth showing verbatim are already written for humans. */
function friendly(message: string): string {
  if (message.includes("Nomination budget")) {
    return "That would spend more than your 5 points.";
  }
  if (message.includes("row-level security")) {
    return "Nominations are closed for this season.";
  }
  return message;
}
