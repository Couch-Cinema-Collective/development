"use server";

import { revalidatePath } from "next/cache";

import { toPoolRow, type PoolRpcRow } from "@/lib/nominations";
import { scoresFor } from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";

export type SeasonActionResult = { error?: string };

async function requireCommissioner(seasonId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, season: null, error: "Sign in first." };

  const { data: season } = await supabase
    .from("seasons")
    .select("id, guild_id, state, film_count, w_guild, w_critic")
    .eq("id", seasonId)
    .maybeSingle();
  if (!season) return { supabase, season: null, error: "Season not found." };

  const { data: membership } = await supabase
    .from("guild_members")
    .select("role")
    .eq("guild_id", season.guild_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership?.role !== "commissioner") {
    return { supabase, season: null, error: "Commissioner only." };
  }

  return { supabase, season, error: null };
}

/**
 * NOMINATING → SLATE_LOCKED. Tallies the pool (via the anonymized RPC — even
 * the commissioner doesn't see who staked what until after lock), applies the
 * weighted cut with tie expansion (PLAN.md §1.2/1.7), layers in external
 * scores (§3.2), and writes the slate.
 */
export async function lockSlate(seasonId: string): Promise<SeasonActionResult> {
  const { supabase, season, error } = await requireCommissioner(seasonId);
  if (error || !season) return { error: error ?? "Season not found." };
  if (season.state !== "NOMINATING" && season.state !== "TALLYING") {
    return { error: "The slate can only be locked from the nomination phase." };
  }

  const { data: rpcRows, error: poolError } = await supabase.rpc(
    "nomination_pool",
    { sid: seasonId },
  );
  if (poolError) return { error: poolError.message };
  const pool = ((rpcRows ?? []) as PoolRpcRow[]).map(toPoolRow);
  if (pool.length === 0) {
    return { error: "Nobody has nominated anything yet — nothing to lock." };
  }

  // Same formula the draft pool preview uses.
  const wGuild = Number(season.w_guild);
  const wCritic = Number(season.w_critic);
  const maxPoints = Math.max(1, ...pool.map((r) => r.points));
  const ranked = pool
    .map((row) => ({
      ...row,
      score:
        wGuild * (row.points / maxPoints) +
        wCritic * ((row.film?.voteAverage ?? 0) / 10),
    }))
    .sort((a, b) => b.score - a.score || b.points - a.points);

  // Cut with tie expansion: a hair's difference at the cutoff is a tie.
  let slate = ranked;
  if (ranked.length > season.film_count) {
    const cutoff = ranked[season.film_count - 1].score;
    slate = ranked.filter(
      (entry, i) => i < season.film_count || Math.abs(entry.score - cutoff) < 1e-9,
    );
  }

  // External scores, fetched once at lock and frozen into the snapshot.
  const scores = await scoresFor(slate.map((s) => s.film?.imdbId));

  const { error: slateError } = await supabase.from("slate_films").upsert(
    slate.map((entry) => ({
      season_id: seasonId,
      tmdb_id: entry.tmdbId,
      film: {
        ...entry.film,
        externalScores: entry.film?.imdbId
          ? (scores[entry.film.imdbId] ?? undefined)
          : undefined,
      },
    })),
    { onConflict: "season_id,tmdb_id" },
  );
  if (slateError) return { error: slateError.message };

  const { error: stateError } = await supabase
    .from("seasons")
    .update({ state: "SLATE_LOCKED" })
    .eq("id", seasonId);
  if (stateError) return { error: stateError.message };

  revalidatePath(`/guild/${season.guild_id}`);
  return {};
}

/** The commissioner-driven forward transitions outside lock and publish. */
const ADVANCES: Record<string, string> = {
  SLATE_LOCKED: "WATCHING",
  WATCHING: "VOTING",
  PUBLISHED: "ARCHIVED",
};

export async function advanceSeason(
  seasonId: string,
): Promise<SeasonActionResult> {
  const { supabase, season, error } = await requireCommissioner(seasonId);
  if (error || !season) return { error: error ?? "Season not found." };

  const to = ADVANCES[season.state];
  if (!to) return { error: `No manual advance from ${season.state}.` };

  const { error: stateError } = await supabase
    .from("seasons")
    .update({ state: to })
    .eq("id", seasonId);
  if (stateError) return { error: stateError.message };

  revalidatePath(`/guild/${season.guild_id}`);
  return {};
}

/**
 * VOTING → PUBLISHED, via the database's publish_season() — results are
 * computed and written inside Postgres and cannot be edited afterward (§2).
 */
export async function publishSeason(
  seasonId: string,
): Promise<SeasonActionResult> {
  const { supabase, season, error } = await requireCommissioner(seasonId);
  if (error || !season) return { error: error ?? "Season not found." };

  const { error: rpcError } = await supabase.rpc("publish_season", {
    sid: seasonId,
  });
  if (rpcError) return { error: rpcError.message };

  revalidatePath(`/guild/${season.guild_id}`);
  return {};
}
