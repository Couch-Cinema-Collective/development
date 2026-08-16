"use server";

import { createClient } from "@/lib/supabase/server";

export type VoteResult = { error?: string };

/**
 * One vote per award category, revisable until publish. The DB enforces
 * membership and the VOTING window; the honor-system eligibility gate (§1.5)
 * is checked here — the doc's rule is "don't finish the movies, don't vote."
 */
export async function castVote(input: {
  seasonId: string;
  awardId: string;
  tmdbId: number;
  /** Acting categories are won by a person; every other award leaves this off. */
  person?: { id: number; name: string; character: string; profilePath: string | null };
}): Promise<VoteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { data: season } = await supabase
    .from("seasons")
    .select("state, eligibility")
    .eq("id", input.seasonId)
    .maybeSingle();
  if (!season) return { error: "Season not found." };
  if (season.state !== "VOTING") {
    return { error: "Voting isn't open for this season." };
  }

  if (season.eligibility === "honor") {
    const [{ count: slateCount }, { count: watchedCount }] = await Promise.all([
      supabase
        .from("slate_films")
        .select("tmdb_id", { count: "exact", head: true })
        .eq("season_id", input.seasonId),
      supabase
        .from("watch_records")
        .select("tmdb_id", { count: "exact", head: true })
        .eq("season_id", input.seasonId)
        .eq("user_id", user.id),
    ]);
    if ((watchedCount ?? 0) < (slateCount ?? 0)) {
      return { error: "Finish the slate to vote — that's the deal." };
    }
  }

  const { error } = await supabase.from("votes").upsert(
    {
      season_id: input.seasonId,
      user_id: user.id,
      award_id: input.awardId,
      tmdb_id: input.tmdbId,
      person_id: input.person?.id ?? null,
      person: input.person ?? null,
    },
    { onConflict: "season_id,user_id,award_id" },
  );
  if (error) return { error: error.message };

  return {};
}
